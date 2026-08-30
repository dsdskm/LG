import { API_BASE } from './index'
const apiUrl = (path) => `${API_BASE}${path}`

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
    const message = body?.detail || body?.error || body?.message || res.statusText || 'API 요청 실패'
    throw new Error(`${message} (${res.status})`)
  }

  return body
}

// Wi-Fi 스캔
export async function scanWifi() {
  const res = await fetch(apiUrl(`/api/wifi/scan`), {
    method: 'GET',
    cache: 'no-store'
  })
  return readJsonResponse(res)
}

// Wi-Fi 연결
export async function connectWifi(ssid, password, hidden = false) {
  const res = await fetch(apiUrl(`/api/wifi/connect`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssid, password, hidden })
  })
  return readJsonResponse(res)
}

// Wi-Fi 연결 해제
export async function disconnectWifi() {
  const res = await fetch(apiUrl(`/api/wifi/disconnect`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return readJsonResponse(res)
}

// AP 모드에서 캐시/실시간 스캔이 모두 비어 있을 때 AP를 잠시 내리고 재스캔
export async function rescanWifiOffline() {
  const res = await fetch(apiUrl(`/api/wifi/rescan-offline`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  return readJsonResponse(res)
}

// Wi-Fi 상태/접속 주소 조회
export async function getWifiStatus() {
  const res = await fetch(apiUrl(`/api/wifi/status`), {
    method: 'GET',
    cache: 'no-store'
  })
  return readJsonResponse(res)
}

// Wi-Fi 인터페이스 모드 상태 조회
export async function getWifiModeStatus() {
  const res = await fetch(apiUrl(`/api/wifi/mode-status`), {
    method: 'GET',
    cache: 'no-store'
  })
  return readJsonResponse(res)
}

// Wi-Fi 인터페이스 모드 변경: concurrent | single
export async function switchWifiMode(mode) {
  const res = await fetch(apiUrl(`/api/wifi/mode`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  })
  return readJsonResponse(res)
}

export function getApiBase() {
  return apiUrl('') || API_BASE
}
