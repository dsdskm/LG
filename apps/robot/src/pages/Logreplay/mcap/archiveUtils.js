// mcap/archiveUtils.js

const TAR_BLOCK = 512

/** Compression Streams API 지원 여부 */
export function supportsCompressionStreams() {
  return typeof DecompressionStream !== 'undefined'
}

/** gzip → Uint8Array (Compression Streams API 사용, 미지원 시 에러 throw) */
export async function gunzipToUint8Array(u8) {
  if (!supportsCompressionStreams()) {
    throw new Error('DecompressionStream API not supported')
  }
  const ds = new DecompressionStream('gzip')
  const blob = new Blob([u8], { type: 'application/gzip' })
  const stream = blob.stream().pipeThrough(ds)
  const ab = await new Response(stream).arrayBuffer()
  return new Uint8Array(ab)
}

// ──────────────────────────────────────────────────────────────
// tar helpers

function readString(buf, start, len) {
  const s = new TextDecoder('latin1').decode(buf.subarray(start, start + len))
  return s.replace(/\0.*$/, '')
}

function readSizeOctal(buf, start, len) {
  const raw = readString(buf, start, len).trim()
  if (!raw) return 0
  const m = raw.match(/^[0-7]+$/)
  if (!m) {
    try {
      return parseInt(raw, 8)
    } catch {
      return 0
    }
  }
  return parseInt(raw, 8)
}

/**
 * 표준 ustar 기반의 단순 tar 엔트리 파서
 * @returns {Array<{name:string, size:number, typeflag:number, bytes:Uint8Array}>}
 */
export function parseTarEntries(u8) {
  const out = []
  let off = 0

  const isZeroBlock = (pos) => {
    for (let i = pos; i < pos + TAR_BLOCK; i++) if (u8[i] !== 0) return false
    return true
  }

  while (off + TAR_BLOCK <= u8.length) {
    if (isZeroBlock(off)) break // EOF

    const name = readString(u8, off + 0, 100)
    const size = readSizeOctal(u8, off + 124, 12)
    const typeflag = u8[off + 156] || 0 // 48('0')=regular, 53('5')=dir, 120('x')=pax

    const contentStart = off + TAR_BLOCK
    const contentEnd = contentStart + size
    if (contentEnd > u8.length) break // 손상 방지

    const bytes = u8.subarray(contentStart, contentEnd)
    out.push({ name, size, typeflag, bytes })

    // 512 경계 패딩
    const pad = (TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK
    off = contentEnd + pad
  }

  return out
}

/** tar typeflag가 정규 파일인지 확인 */
export function isRegularFile(typeflag) {
  // '0' (48) 또는 0 으로 오는 경우를 모두 허용
  return typeflag === 0 || typeflag === 48 // ASCII '0'
}

/** 파일명이 텍스트 로그로 보이는지 간단 판별 */
export function isTextFileName(name = '') {
  const n = String(name).toLowerCase()
  return n.endsWith('.log') || n.endsWith('.txt') || n.endsWith('.out') || n.endsWith('.trace')
}

/** 제어문자 비율로 텍스트 가능성 판별 */
export function isProbablyText(u8) {
  if (!u8 || u8.length === 0) return false
  const sample = u8.subarray(0, Math.min(u8.length, 8192))
  let nonPrintable = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample[i]
    const printable = c === 9 || c === 10 || c === 12 || c === 13 || (c >= 32 && c <= 126) || c >= 160
    if (!printable) nonPrintable++
  }
  const ratio = nonPrintable / sample.length
  return ratio < 0.05
}

/** UTF-8 우선, 실패 시 latin1로 폴백 */
export function decodeUtf8(u8) {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(u8)
  } catch {
    return new TextDecoder('latin1').decode(u8)
  }
}

/** tar 엔트리 중 텍스트 로그 후보만 필터링 */
export function filterTextEntries(entries) {
  return (
    (entries || [])
      // 1) 정규 파일만
      .filter((e) => isRegularFile(e.typeflag))
      // 2) PAX 헤더/메타 경로 스킵(안전망)
      .filter((e) => {
        const n = String(e.name || '').toLowerCase()
        return !(n.includes('paxheader') || n === './paxheader' || n === 'paxheader')
      })
      // 3) 0바이트 파일 스킵
      .filter((e) => (e.size || 0) > 0)
      // 4) 텍스트 후보만
      .filter((e) => isTextFileName(e.name) && isProbablyText(e.bytes))
  )
}

/** 긴 텍스트를 라인 배열로 */
export function splitLines(text) {
  return String(text || '').split(/\r?\n/)
}
