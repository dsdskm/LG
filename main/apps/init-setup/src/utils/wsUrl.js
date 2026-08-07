/**
 * WebSocket URL의 host(IP) 부분을 현재 접속한 페이지의 hostname으로 교체한다.
 * 프로토콜(ws/wss)과 포트, 경로는 환경변수 값을 그대로 유지한다.
 *
 * foxglove-bridge 에 붙는 화면(Map 스캔, Semantic)이 모두 같은 규칙을 써야 해서 여기에 둔다.
 */
export function resolveWsUrl() {
  const envUrl = import.meta.env.VITE_WEBSOCKET_URL
  try {
    const url = new URL(envUrl)
    url.hostname = window.location.hostname
    return url.toString()
  } catch {
    return envUrl
  }
}
