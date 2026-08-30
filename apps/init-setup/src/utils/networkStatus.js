/**
 * 로봇의 외부 네트워크 연결 상태 판정.
 *
 * 로봇은 초기 모드가 AP(ROBOT_SETUP)라서 노트북이 로봇 AP 에 직접 붙어 init-setup 을 연다.
 * 그런데 로그인은 브라우저가 클라우드(VITE_PROXY_SERVER_BASE_URL)로 직접 치는 구조이므로
 * 로봇이 외부 Wi-Fi 에 붙기 전에는 로그인 자체가 불가능하다 — 그래서 로그인 여부보다
 * 네트워크 설정(/network)이 먼저 와야 한다. 그 판정을 여기서 한다.
 *
 * 판정 근거는 GET /api/wifi/status (init-setup-be → robot-ui-backend → wifi-status 헬퍼)의
 * ssid · ipv4 다. 헬퍼는 STA 인터페이스만 보므로 유선 연결은 알 수 없고, 헬퍼 자체가 실패하는
 * 환경(개발 PC 등)도 있다 — 그래서 online/offline 이분법이 아니라 unknown 을 따로 둔다.
 * unknown 은 게이트를 걸지 않는다(오판으로 /network 에 갇히는 쪽이 더 위험하다).
 */
// 판정 로그 태그. 로봇 AP 로 붙은 노트북의 콘솔에서 'network-gate' 로 필터하면
// 진입 판정 흐름(상태 조회 → 게이트 결정 → 이동)만 볼 수 있다.
export const LOG_TAG = '[network-gate]'

export const ROBOT_ONLINE = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown'
}

/** 헬퍼는 ipv4 를 "10.0.0.5/24" 또는 콤마 연결로 준다 — 첫 주소만 취한다. */
const firstIpv4 = (value) => String(value || '').split(',')[0].split('/')[0].trim()

/**
 * @param {object|null} status GET /api/wifi/status 응답
 * @returns {'online'|'offline'|'unknown'}
 */
export const deriveRobotOnline = (status) => {
  if (!status || typeof status !== 'object') return ROBOT_ONLINE.UNKNOWN
  // { success: false, error } 또는 헬퍼가 JSON 을 못 만든 { success: true, raw } 폴백 — 판정 불가.
  if (status.success === false) return ROBOT_ONLINE.UNKNOWN
  if (status.ssid === undefined) return ROBOT_ONLINE.UNKNOWN

  const ssid = String(status.ssid || '').trim()
  const ipv4 = firstIpv4(status.ipv4 || status.wifi_ip)
  return ssid && ipv4 ? ROBOT_ONLINE.ONLINE : ROBOT_ONLINE.OFFLINE
}

// 게이트 우회 플래그. 로봇이 유선으로 인터넷에 연결된 경우처럼 Wi-Fi 상태만으로는
// offline 으로 보이지만 실제로는 로그인이 되는 구성이 있어서 탈출구를 남긴다.
// 탭을 닫으면 사라지는 sessionStorage 를 쓴다 — 다음 접속에서는 다시 정상 판정한다.
const BYPASS_KEY = 'INIT_SETUP_NETWORK_GATE_BYPASS'

export const isNetworkGateBypassed = () => {
  try {
    return window.sessionStorage.getItem(BYPASS_KEY) === 'Y'
  } catch (error) {
    // 시크릿 모드 등에서 접근이 막힐 수 있다 — 그때는 우회 없음으로 본다.
    return false
  }
}

export const bypassNetworkGate = () => {
  try {
    window.sessionStorage.setItem(BYPASS_KEY, 'Y')
    console.warn(`${LOG_TAG} bypassed by user — 이 탭에서는 네트워크 판정으로 막지 않는다`)
  } catch (error) {
    console.warn('Failed to store network gate bypass flag:', error)
  }
}
