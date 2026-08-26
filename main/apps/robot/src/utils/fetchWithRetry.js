// 재시도해도 안전한(=몇 번을 보내도 결과가 같은, 예: GET) 요청에 한해 일시적 실패를 재시도하는 fetch 래퍼.
// 재시도 대상: 네트워크 레벨 예외(fetch가 throw) + 408/429/5xx
// 재시도 안 함: 그 외 4xx(400/401/403/404 등) — 요청/리소스 상태가 안 바뀌는 한 재시도해도 같이 실패함
// resp.ok 여부는 native fetch와 동일하게 호출부에서 직접 확인해야 함(재시도 불가 실패도 그대로 resp를 반환).

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(resp) {
  const header = resp.headers?.get?.('Retry-After')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return seconds * 1000
  const date = Date.parse(header)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null
}

/**
 * @param {string} url
 * @param {RequestInit} [options] - fetch 옵션(재시도해도 안전한 요청에만 사용할 것)
 * @param {{ retries?: number, baseDelayMs?: number }} [retryOptions] - retries: 추가 시도 횟수(기본 2회 = 총 3회 시도)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, { retries = 2, baseDelayMs = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let resp
    try {
      resp = await fetch(url, options)
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs)
      continue
    }

    if (resp.ok || !RETRYABLE_STATUS.has(resp.status) || attempt >= retries) return resp

    const delay = parseRetryAfterMs(resp) ?? baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs
    await sleep(delay)
  }
}
