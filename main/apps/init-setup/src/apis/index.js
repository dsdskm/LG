// // ✅ 로봇/개발 환경 공통 API BASE
// const API_BASE =
//   import.meta.env.PROD
//     ? `http://${window.location.hostname}:8081`
//     : 'http://localhost:8081'

// export default API_BASE

// Browser에서 API 서버 주소를 계산한다.
// 중요: 폰/PC가 로봇 AP에 접속해서 웹앱을 볼 때 `localhost`는 로봇이 아니라
// 접속한 기기 자신을 의미한다. 그래서 기본값은 현재 웹페이지의 hostname을 사용한다.

//const API_BASE = `http://${window.location.hostname}:8081`
//export default API_BASE

const DEFAULT_API_PORT = import.meta.env.VITE_BE_PORT
const browserHost = window.location.hostname || 'localhost'
const browserProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:'

//-------------------------------------------------------------------
// nginx/captive portal 모드에서는 상대경로 /api 사용
// 예: http://192.168.188.1/api/...
const useRelativeApi = window.location.port === '' || window.location.port === '80'

// 그 외(개발 서버 등)에서는 현재 페이지 hostname + VITE_BE_PORT 로 직접 호출한다.
// 고정 base URL 환경변수는 쓰지 않는다 — 폰/PC 가 로봇 AP 로 접속하는 구성에서
// localhost 나 빌드 시점 IP 가 박히면 API 호출이 깨진다.
const API_BASE = useRelativeApi ? '' : `${browserProtocol}//${browserHost}:${DEFAULT_API_PORT}`

export default API_BASE
