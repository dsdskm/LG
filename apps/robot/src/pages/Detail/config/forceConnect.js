// src/utils/forceConnect.js
// 강제 연결 설정: ON이면 ConsoleCard가 연결 상태 사전 점검(getDeviceInfo 폴링) 없이
// 바로 연결(iframe/realtime WS)을 시도한다.
const FORCE_CONNECT_KEY = 'robot-console-force-connect'

export function getForceConnect() {
  const stored = localStorage.getItem(FORCE_CONNECT_KEY)
  return stored === null ? true : stored === 'true'
}

export function setForceConnect(value) {
  localStorage.setItem(FORCE_CONNECT_KEY, String(value))
}
