// decoder.js
// - 페이로드 디코딩 메인(텍스트/JSON/ROS/바이너리 휴리스틱) + rosout 포맷팅
// - 경량 디버그 로그 추가(DEBUG_DECODE로 제어)

import {
  asUint8Array,
  decodeUtf8WithReplacement,
  looksLikeText,
  sanitizeText,
  extractPrintableRuns,
  isProbablyBinary,
  toKST12h
} from './utils.js'
import { parse as parseRosMsg } from '@lichtblick/rosmsg'
import { MessageReader as Ros1Reader } from '@lichtblick/rosmsg-serialization'
import { parseRos2idl } from '@lichtblick/ros2idl-parser'
let __Ros2Reader

const DEBUG_DECODE = false // 필요 시 true로 바꿔 경로/예외 로그 활성화

async function getRos2Reader() {
  if (!__Ros2Reader) {
    const m = await import('@lichtblick/rosmsg2-serialization')
    __Ros2Reader = m.MessageReader
  }
  return __Ros2Reader
}

function safeStringify(obj) {
  return JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))
}

/** Little-Endian DataView helper */
function dvLE(u8, offset, type) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  switch (type) {
    case 'i32':
      return dv.getInt32(offset, true)
    case 'u32':
      return dv.getUint32(offset, true)
    case 'u8':
      return dv.getUint8(offset)
    default:
      return 0
  }
}

// CDR string 읽기
function readCDRString(u8, offset) {
  if (offset + 4 > u8.length) return { value: '', next: offset, ok: false }
  const len = dvLE(u8, offset, 'u32')
  let next = offset + 4
  const end = next + len
  if (len < 0 || end > u8.length) return { value: '', next: end, ok: false }
  const value = decodeUtf8WithReplacement(u8.subarray(next, end))
  next = end
  const pad = (4 - (next % 4)) & 3
  next += pad
  return { value, next, ok: true }
}

function _asciiRatio(s) {
  if (!s || !s.length) return 1
  let p = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) p++
  }
  return p / s.length
}

function _plausibleFields({ name, msg, file, func }) {
  const within = (s, min, max) => typeof s === 'string' && s.length >= min && s.length <= max
  return (
    within(name, 0, 256) &&
    within(msg, 0, 8192) &&
    within(file, 0, 2048) &&
    within(func, 0, 512) &&
    _asciiRatio(name) >= 0.6 &&
    _asciiRatio(msg) >= 0.5
  )
}

const _validLevels = new Set([10, 20, 30, 40, 50]) // DEBUG/INFO/WARN/ERROR/FATAL

function _parseRos2LogAt(u8, off0) {
  let off = off0
  const N = u8.length
  // stamp (int32 sec, uint32 nanosec)
  if (off + 8 > N) return null
  const sec = dvLE(u8, off, 'i32')
  off += 4
  const nsec = dvLE(u8, off, 'u32')
  off += 4

  // 타임스탬프 범위 검증: 2000-01-01 ~ 2100-01-01
  const minSec = 946684800,
    maxSec = 4102444800
  if (sec < minSec || sec > maxSec) return null

  // level (uint8) + 3 padding
  if (off + 4 > N) return null
  const level = dvLE(u8, off, 'u8')
  off += 4
  if (!_validLevels.has(level)) return null

  // strings: name, msg, file, function
  const r1 = readCDRString(u8, off)
  if (!r1.ok) return null
  const name = r1.value
  off = r1.next
  const r2 = readCDRString(u8, off)
  if (!r2.ok) return null
  const msg = r2.value
  off = r2.next
  const r3 = readCDRString(u8, off)
  if (!r3.ok) return null
  const file = r3.value
  off = r3.next
  const r4 = readCDRString(u8, off)
  if (!r4.ok) return null
  const func = r4.value
  off = r4.next

  // line (uint32) optional
  let line = 0
  if (off + 4 <= N) {
    line = dvLE(u8, off, 'u32')
    off += 4
  }

  const fieldsOk = _plausibleFields({ name, msg, file, func })
  if (!fieldsOk) return null

  return {
    stamp: { sec, nanosec: nsec },
    level,
    name,
    msg,
    file,
    function: func,
    line
  }
}

function tryDecodeRos2LogHeuristic(payload) {
  const u8 = asUint8Array(payload)
  const attempts = []
  const maxProbe = Math.min(u8.length - 8, 64)
  for (let base = 0; base <= maxProbe; base += 4) attempts.push(base)

  for (const base of attempts) {
    const obj = _parseRos2LogAt(u8, base)
    if (obj) {
      return formatRosoutLine(obj, { tz: 'Asia/Seoul' })
    }
  }
  return null
}

function ros2LogLevelToString(lv) {
  const map = { 10: 'DEBUG', 20: 'INFO', 30: 'WARN', 40: 'ERROR', 50: 'FATAL' }
  return map[lv] || String(lv)
}

export function formatRosoutLine(obj, { tz = 'Asia/Seoul' } = {}) {
  const level = ros2LogLevelToString(obj?.level)
  const kst = toKST12h(obj?.stamp, tz)
  const name = obj?.name ?? ''
  const text = obj?.msg ?? ''
  return `[ ${level}][${kst}][${name}]: ${text}`
}

/**
 * 채널/페이로드 기준으로 적절한 디코딩을 수행해 사람이 읽을 수 있는 문자열 반환.
 * @param {Uint8Array} payload
 * @param {{ messageEncoding?: string, schemaId?: number, topic?: string }} channel
 * @param {(id:number)=>any} schemaResolver
 * @returns {Promise<string|null>}
 */
export async function tryDecodePayload(payload, channel, schemaResolver) {
  const encRaw = String(channel?.messageEncoding || 'unknown').toLowerCase()
  const enc = encRaw.replace(/-/g, '_').replace('cdr_le', 'cdr').replace('cdr little', 'cdr')

  const schemaId = typeof channel?.schemaId === 'number' ? channel.schemaId : undefined
  const schema = schemaId ? schemaResolver(schemaId) : undefined
  const schemaEnc = String(schema?.encoding || '').toLowerCase()

  const topic = channel?.topic || ''
  let reason = ''

  if (DEBUG_DECODE) {
    console.debug('[MCAP decode] begin', { topic, enc, schemaEnc, schemaName: schema?.name, len: payload?.byteLength })
  }

  // rosout 휴리스틱 (ROS2 Log)
  const maybeRosout = topic.endsWith('/rosout') || /(^|\/)rcl_interfaces\/msg\/Log$/.test(String(schema?.name || ''))
  if (maybeRosout && (enc === 'cdr' || schemaEnc.includes('ros2') || schemaEnc.includes('rosidl'))) {
    const pretty = tryDecodeRos2LogHeuristic(payload)
    if (pretty) return pretty
  }

  // 1) JSON / 텍스트
  if (enc === 'json' || enc === 'utf8' || enc === 'text' || schemaEnc === 'json') {
    try {
      return decodeUtf8WithReplacement(payload)
    } catch (e) {
      reason = `text-decode-fail: ${e?.message || e}`
      console.warn('[MCAP][decode] text/json failed:', e)
    }
  }

  // 2) ROS 2 / ROS 1 (스키마 기반)
  if (
    enc === 'cdr' ||
    enc === 'ros1' ||
    schemaEnc.includes('ros2') ||
    schemaEnc.includes('rosidl') ||
    schemaEnc.includes('ros1')
  ) {
    if (!schema) {
      reason = 'no-schema'
    } else {
      const decoder = await buildDecoderForSchema(schema)
      if (!decoder) {
        reason = `decoder-null (schemaEnc=${schemaEnc}, name=${schema?.name})`
      } else {
        try {
          const obj = decoder.decode(payload)

          const typeName = String(decoder.typeName || '')
          const isRos2LogType = typeName.endsWith('/Log') || typeName.includes('rcl_interfaces/msg/Log')
          const isRosoutTopic = topic.endsWith('/rosout')

          if (isRos2LogType || isRosoutTopic) {
            return formatRosoutLine(obj, { tz: 'Asia/Seoul' })
          }
          return safeStringify(obj)
        } catch (e) {
          reason = `decode-exception: ${e?.message || e}`
          console.warn('[MCAP][decode] ROS decode failed:', {
            enc,
            schemaEnc,
            name: schema?.name,
            reason
          })
        }
      }
    }
  }

  // 3) Protobuf (미구현)
  if (enc === 'protobuf' || schemaEnc.includes('protobuf')) {
    reason = 'protobuf-not-implemented'
  }

  // 4) 바이너리/텍스트 휴리스틱 폴백
  try {
    const u8 = asUint8Array(payload)

    if (isProbablyBinary(u8)) {
      const imgLike = /image|camera|dnn_image|compressed|points|pointcloud|lidar|scan/i.test(
        String(channel?.topic || '')
      )
      const kindHint = imgLike ? 'BINARY(image?)' : enc || 'BINARY'
      return `<${kindHint} ${u8.byteLength}B>`
    }

    let text = decodeUtf8WithReplacement(u8)
    if (!looksLikeText(text)) {
      const ascii = extractPrintableRuns(u8, 4, ' ')
      text = ascii && ascii.length >= 4 ? ascii : `<${enc || 'unknown'} ${u8.byteLength}B>`
    }
    return sanitizeText(text)
  } catch {
    /* no-op */
  }

  if (DEBUG_DECODE) {
    console.debug('[MCAP decode] null. reason:', reason || 'unknown', {
      enc,
      schemaEnc,
      topic,
      len: payload.byteLength,
      schemaName: schema?.name
    })
  }
  return null
}

export async function buildDecoderForSchema(sch) {
  if (!sch) return null
  const enc = String(sch.encoding || '').toLowerCase()
  const typeName = String(sch.name || '')
  let defText = ''
  if (typeof sch.data === 'string') {
    defText = sch.data
  } else if (sch.data instanceof Uint8Array) {
    defText = new TextDecoder().decode(sch.data)
  } else if (sch.data && sch.data.buffer) {
    defText = new TextDecoder().decode(new Uint8Array(sch.data.buffer))
  }
  if (!defText || defText.length === 0) return null

  const isRos2Idl = enc.includes('ros2idl') || enc.includes('omgidl')
  const isRos2Msg = enc.includes('ros2') || enc.includes('ros2msg')
  const isRos1Msg = enc.includes('ros1') || enc.includes('ros1msg')

  try {
    if (isRos2Idl) {
      const defs = parseRos2idl(defText)
      const Ros2Reader = await getRos2Reader()
      const reader = new Ros2Reader(defs)
      return {
        typeName,
        decode: (u8) => reader.readMessage(asUint8Array(u8))
      }
    }
    if (isRos2Msg) {
      const defs = parseRosMsg(defText, { ros2: true })
      const Ros2Reader = await getRos2Reader()
      const reader = new Ros2Reader(defs)
      return {
        typeName,
        decode: (u8) => reader.readMessage(asUint8Array(u8))
      }
    }
    if (isRos1Msg) {
      const defs = parseRosMsg(defText)
      const reader = new Ros1Reader(defs)
      return {
        typeName,
        decode: (u8) => reader.readMessage(asUint8Array(u8))
      }
    }
  } catch (e) {
    console.warn('[decoder.js] buildDecoderForSchema failed:', { enc, typeName, err: e })
    return null
  }
  return null
}
