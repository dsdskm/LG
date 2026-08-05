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

const envBase = import.meta.env.VITE_API_BASE_URL
const envBaseIsLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envBase || '')

// VITE_API_BASE_URL이 명시되어 있고 localhost가 아닌 경우만 우선 사용한다.
// localhost 값은 외부 폰/PC 접속에서 API 호출을 깨뜨리므로 무시한다.
// const API_BASE = envBase && !envBaseIsLocalhost
//   ? envBase.replace(/\/$/, '')
//   : `${browserProtocol}//${browserHost}:${DEFAULT_API_PORT}`

//-------------------------------------------------------------------
// nginx/captive portal 모드에서는 상대경로 /api 사용
// 예: http://192.168.188.1/api/...
const useRelativeApi = window.location.port === '' || window.location.port === '80'

const API_BASE = useRelativeApi
  ? ''
  : envBase && !envBaseIsLocalhost
    ? envBase.replace(/\/$/, '')
    : `${browserProtocol}//${browserHost}:${DEFAULT_API_PORT}`

export default API_BASE
