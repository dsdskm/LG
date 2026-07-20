import API_BASE from './index'

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

// Wi-Fi 스캔
export async function scanWifi() {
  const res = await fetch(`${API_BASE}/api/wifi/scan`, {
    method: 'GET',
    cache: 'no-store'
  })
  return readJsonResponse(res)
}

// Wi-Fi 연결
export async function connectWifi(ssid, password) {
  const res = await fetch(`${API_BASE}/api/wifi/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid, password })
  })
  return readJsonResponse(res)
}

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
