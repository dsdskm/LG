import API_BASE from './index'

/**
 * fetch 응답을 JSON 으로 파싱하는 공용 헬퍼.
 * 본문이 비어 있거나 JSON 이 아니면 { raw } 로 감싸고,
 * HTTP 실패(!res.ok)면 body.error/message/statusText 를 메시지로 예외를 던진다.
 * @param {Response} res fetch 응답
 * @returns {Promise<object>} 파싱된 응답 본문
 * @throws {Error} HTTP 상태가 실패인 경우
 */
async function readJsonResponse(res) {
  const text = await res.text()
  let body = {}

  if (text) {
    try {
      body = JSON.parse(text)
    } catch (e) {
      body = { raw: text }
    }
  }

  if (!res.ok) {
    const message = body?.error || body?.message || res.statusText || 'API 요청 실패'
    throw new Error(`${message} (${res.status})`)
  }

  return body
}

/**
 * Wi-Fi 스캔 (GET /api/wifi/scan).
 * 캡티브 포털에서 매번 최신 목록이 필요하므로 cache: 'no-store' 로 요청한다.
 * @returns {Promise<object>} 스캔된 AP 목록 응답
 */
export async function scanWifi() {
  const res = await fetch(`${API_BASE}/api/wifi/scan`, {
    method: 'GET',
    cache: 'no-store'
  })
  return readJsonResponse(res)
}

/**
 * 지정한 AP 로 Wi-Fi 연결 (POST /api/wifi/connect).
 * @param {string} ssid 접속할 AP 의 SSID
 * @param {string} password AP 비밀번호 (개방망이면 빈 문자열)
 * @returns {Promise<object>} 연결 결과 응답
 */
export async function connectWifi(ssid, password) {
  const res = await fetch(`${API_BASE}/api/wifi/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid, password })
  })
  return readJsonResponse(res)
}

/**
 * 현재 계산된 API BASE 문자열 반환 (디버깅/화면 표시용).
 * @returns {string} API BASE (상대경로 모드에서는 빈 문자열)
 */
export function getApiBase() {
  return API_BASE
}

// import API_BASE from './index'

// // ✅ Wi‑Fi 스캔
// export async function scanWifi() {
//   const res = await fetch(`${API_BASE}/api/wifi/scan`)
//   return res.json()
// }

// // ✅ Wi‑Fi 연결 (다음 단계용)
// export async function connectWifi(ssid, password) {
//   const res = await fetch(`${API_BASE}/api/wifi/connect`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ ssid, password })
//   })
//   return res.json()
// }
// ``
