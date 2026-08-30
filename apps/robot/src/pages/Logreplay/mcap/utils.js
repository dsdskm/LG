// utils.js
// - 공통 유틸: Uint8Array 변환, 문자열/텍스트 품질, 시간 포맷, 레코드 정규화, 로그 라인 등

// TextDecoder 재사용
const td = new TextDecoder('utf-8')

// 서울 시간(KST) 12시간 포맷
const KST_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  hour12: true,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit'
})

/** 다양한 형태(raw)를 안전하게 Uint8Array로 변환 */
export function asUint8Array(raw) {
  if (!raw) return new Uint8Array()
  if (raw instanceof Uint8Array) return raw
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  if (ArrayBuffer.isView(raw)) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(raw)) {
    return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  }
  throw new Error(`Unsupported payload type: ${Object.prototype.toString.call(raw)}`)
}

/** UTF-8 디코딩(치환 허용) */
export function decodeUtf8WithReplacement(u8) {
  try {
    return td.decode(u8)
  } catch {
    return ''
  }
}

/** 인쇄 가능한 문자 비율 기반 가독성 판단 */
export function looksLikeText(s) {
  if (!s) return false
  let printable = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) printable++
  }
  return printable / s.length >= 0.6
}

/** 텍스트 클리닝: 제어문자 제거 + 긴 공백 정리 + 과도 길이 축약 */
export function sanitizeText(s, limit = 20000) {
  if (!s) return s
  const cleaned = s
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uD7FF\uE000-\uFFFD]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
  if (cleaned.length > limit) return cleaned.slice(0, limit) + ' …(truncated)'
  return cleaned
}

/** 바이너리에서 가독성 있는 ASCII 런만 추출(비상용) */
export function extractPrintableRuns(u8, minRun = 4, joiner = ' ') {
  let run = []
  const out = []
  for (let i = 0; i < u8.length; i++) {
    const c = u8[i]
    const isPrintable = c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)
    if (isPrintable) {
      run.push(String.fromCharCode(c))
    } else {
      if (run.length >= minRun) out.push(run.join(''))
      run = []
    }
  }
  if (run.length >= minRun) out.push(run.join(''))
  return out.join(joiner)
}

/** 바이너리 판별: NUL 바이트/아스키 비율로 간단 추정 */
export function isProbablyBinary(u8) {
  if (!u8 || u8.length === 0) return false
  const n = Math.min(u8.length, 4096)
  let printable = 0,
    nul = 0
  for (let i = 0; i < n; i++) {
    const c = u8[i]
    if (c === 0) nul++
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) printable++
  }
  const ratio = printable / n
  if (nul > 0) return true
  if (ratio < 0.4) return true
  return false
}

/* ───────── 시간/표시 유틸 ───────── */

export function toKST12h(stamp, tz = 'Asia/Seoul') {
  try {
    const sec = Number(stamp?.sec ?? 0)
    const nsec = Number(stamp?.nanosec ?? 0)
    const msEpoch = sec * 1000 + Math.floor(nsec / 1e6)
    const d = new Date(msEpoch)

    const parts = KST_FMT.formatToParts(d).reduce((acc, p) => ((acc[p.type] = p.value), acc), {})

    const ms = String(d.getMilliseconds()).padStart(3, '0')
    const hh = parts.hour // 1~12
    const mm = parts.minute // 00~59
    const ss = parts.second // 00~59
    const dayPeriod = parts.dayPeriod?.toUpperCase() || (d.getHours() < 12 ? 'AM' : 'PM')
    return `${hh}:${mm}:${ss}.${ms} ${dayPeriod} KST`
  } catch {
    return ''
  }
}

export function tsISO(nsec) {
  const big = typeof nsec === 'bigint' ? nsec : BigInt(nsec || 0)
  const ms = Number(big / 1000000n)
  return new Date(ms).toISOString()
}

export function line(tsISO, topic, text) {
  return `[${tsISO}] ${topic} ${sanitizeText(String(text))}`
}

export function safeError(e) {
  try {
    return e?.message || String(e)
  } catch {
    return String(e)
  }
}

export function cleanupStats(arr) {
  try {
    delete arr.__stats
  } catch {
    /* noop */
  }
}

/* ───────── 레코드 정규화 ───────── */

export function normalizeId(idLike) {
  return typeof idLike === 'bigint' ? Number(idLike) : Number(idLike ?? 0)
}
export function toBigInt(v) {
  if (typeof v === 'bigint') return v
  try {
    const n = Number(v ?? 0)
    return BigInt(n)
  } catch {
    return 0n
  }
}

// 판별
export function isSchemaRecord(rec) {
  if (!rec) return false
  if (rec.type === 'Schema') return true
  if (rec.schema) return true
  if (rec.record?.schema) return true
  if (rec.id != null && (rec.name != null || rec.encoding != null) && rec.type === 'Schema') return true
  return false
}

export function isChannelRecord(rec) {
  if (!rec) return false
  if (rec.type === 'Channel') return true
  if (rec.channel) return true
  if (rec.record?.channel) return true
  if (
    rec.type === 'Channel' ||
    (rec.id != null && rec.schemaId != null && rec.topic != null && rec.messageEncoding != null)
  )
    return true
  return false
}

export function isMessageRecord(rec) {
  if (!rec) return false
  if (rec.type === 'Message') return true
  if (rec.message) return true
  if (rec.record?.message) return true
  if (rec.channelId != null && (rec.data != null || rec.logTime != null)) return true
  return false
}

// 추출/정규화
export function normalizeSchema(s) {
  return {
    id: normalizeId(s.id),
    name: s.name,
    encoding: s.encoding,
    data: s.data
  }
}

export function normalizeChannel(ch) {
  return {
    id: normalizeId(ch.id),
    schemaId: normalizeId(ch.schemaId),
    topic: ch.topic,
    messageEncoding: ch.messageEncoding,
    metadata: ch.metadata ?? {}
  }
}

export function normalizeMessage(m) {
  return {
    channelId: normalizeId(m.channelId),
    logTime: toBigInt(m.logTime ?? 0n),
    publishTime: toBigInt(m.publishTime ?? 0n),
    data: m.data ?? new Uint8Array()
  }
}

export function getSchemaFromRecord(rec) {
  if (rec?.schema) return normalizeSchema(rec.schema)
  if (rec?.record?.schema) return normalizeSchema(rec.record.schema)
  if (rec?.type === 'Schema' && rec?.id != null) {
    return normalizeSchema({
      id: rec.id,
      name: rec.name,
      encoding: rec.encoding,
      data: rec.data
    })
  }
  return null
}

export function getChannelFromRecord(rec) {
  if (rec?.channel) return normalizeChannel(rec.channel)
  if (rec?.record?.channel) return normalizeChannel(rec.record.channel)

  const looksFlat =
    (rec?.type === 'Channel' || rec?.type === undefined) &&
    rec?.id != null &&
    rec?.schemaId != null &&
    rec?.topic != null &&
    rec?.messageEncoding != null

  if (looksFlat) {
    return normalizeChannel({
      id: rec.id,
      schemaId: rec.schemaId,
      topic: rec.topic,
      messageEncoding: rec.messageEncoding,
      metadata: rec.metadata ?? {}
    })
  }
  return null
}

export function getMessageFromRecord(rec) {
  if (rec?.message) return normalizeMessage(rec.message)
  if (rec?.record?.message) return normalizeMessage(rec.record.message)
  const looksFlat = rec?.channelId != null && (rec?.data != null || rec?.logTime != null)
  if (looksFlat) {
    return normalizeMessage({
      channelId: rec.channelId,
      logTime: rec.logTime ?? 0n,
      publishTime: rec.publishTime ?? 0n,
      data: rec.data ?? new Uint8Array()
    })
  }
  return null
}

// utils.js  (추가/교체)

export function computeViewportFromGrid(gridMeta, canvasWidth, canvasHeight, paddingPx = 24) {
  // gridMeta: { origin: {x,y}, resolution /*meters per cell*/, width, height }
  if (!gridMeta || !gridMeta.width || !gridMeta.height || !gridMeta.resolution) {
    // 기본 뷰(1m=50px) – 데이터 없을 때 임시
    return {
      worldOrigin: { x: 0, y: 0 },
      metersPerPixel: 1 / 50,
      paddingPx
    }
  }
  const worldWidthM = gridMeta.width * gridMeta.resolution
  const worldHeightM = gridMeta.height * gridMeta.resolution

  const scaleX = worldWidthM / Math.max(1, canvasWidth - paddingPx * 2)
  const scaleY = worldHeightM / Math.max(1, canvasHeight - paddingPx * 2)
  const metersPerPixel = Math.max(scaleX, scaleY)

  // 지도 원점(맵 좌하/좌상 등) → 화면 중앙에 오도록 worldOrigin 보정
  const centerWorld = {
    x: gridMeta.origin.x + worldWidthM / 2,
    y: gridMeta.origin.y + worldHeightM / 2
  }

  // 화면 중앙 픽셀
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2

  // worldOrigin: (0,0)이 화면 어디에 그려질지 기준점(픽셀)
  // 여기서는 세계좌표 (centerWorld)가 캔버스 중앙(cx, cy)에 오도록 설정
  const worldOrigin = {
    x: cx - centerWorld.x / metersPerPixel,
    y: cy + centerWorld.y / metersPerPixel // y축 위/아래 방향 주의
  }

  return { worldOrigin, metersPerPixel, paddingPx }
}

export function worldToScreen(x, y, view) {
  // view: {worldOrigin:{x,y}, metersPerPixel}
  return {
    sx: view.worldOrigin.x + x / view.metersPerPixel,
    sy: view.worldOrigin.y - y / view.metersPerPixel
  }
}

export function clearCanvas(cvs, ctx) {
  ctx.clearRect(0, 0, cvs.width, cvs.height)
}
