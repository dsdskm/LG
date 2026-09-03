import { client } from '@repo/apis'
import { API_BASE } from './index'

// 클라우드(API_DM_BASE)로 직접 가지 않고 로봇 BE 의 대행 라우트(/api/dm)로 보낸다 —
// 노트북/폰이 로봇 setup AP 에 붙어 있으면 브라우저의 외부 경로는 로봇뿐이다.
// axios 클라이언트를 쓰므로 Authorization 주입과 응답 언랩은 기존과 동일하게 동작한다.
const axiosApi = client(`${API_BASE}/api/dm`)

const retrieveSiteScope = async (siteId, params) => {
  return await axiosApi.get(`/sites/${siteId}`, { params })
}

/**
 * 로봇 BE 를 경유하는 로그인.
 *
 * 초기 설정은 노트북/폰이 로봇의 setup AP(ROBOT_SETUP)에 붙은 상태로 진행하므로
 * 브라우저에서 클라우드로 직접 로그인할 수 없다(브라우저의 외부 경로는 로봇뿐).
 * 로봇은 concurrent 모드에서 외부 Wi-Fi 로 나갈 수 있으니 init-setup-be 가 대신 로그인한다.
 * 그래서 이 요청만 API_DM_BASE(클라우드)가 아니라 API_BASE(로봇 BE)로 나간다.
 *
 * 반환/에러 형태는 @repo/apis 의 login 과 같게 맞춘다(useLogin 이 그대로 쓴다):
 * - 성공: 클라우드 로그인 본문(accessToken/refreshToken/userId) + userInfo
 * - 실패: error.response.data.errorCode 를 담은 Error (useLogin 이 메시지 키로 변환)
 *
 * userInfo 는 BE 가 로그인 응답에 직접 붙여 준다(services/cloudAuth.service.js) — userRole 조회도
 * 같은 네트워크 제약을 받는 클라우드 호출이라 BE 가 한 번에 처리한다. 그래서 FE 에는 이에 대응하는
 * 별도 조회 함수가 없고, useLogin 이 응답의 userInfo 를 그대로 쓴다.
 */
const loginViaRobot = async (userEmail, userPassword) => {
  return await requestViaRobot('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, userPassword })
  })
}

/**
 * 세션(accessToken) 유효성 확인. 로그인과 같은 이유로 로봇 BE 를 경유한다.
 *
 * BE 는 만료된 토큰에도 200 { valid: false } 로 답한다(init-setup-be routes/auth.routes.js) —
 * 401 로 오면 공용 axios 인터셉터가 먼저 강제 로그아웃을 돌려 화면 쪽에서 '갱신 → 실패 시 안내'
 * 순서를 제어할 수 없다.
 *
 * 토큰은 헤더와 쿼리 양쪽으로 보낸다. 관제(로봇 웹 콘솔) 진입은 이 앱을 robot-proxy 오리진의
 * iframe 으로 띄우는데, 그 터널을 지나온 요청에는 Authorization 헤더가 남지 않아 BE 가
 * accessToken 누락으로 400 을 낸다. 반면 쿼리는 확실히 통과한다 — 진입 URL 자체가
 * ?accessToken=... 로 오기 때문이다. BE 는 헤더가 있으면 헤더를 우선한다
 * (init-setup-be routes/auth.routes.js). 프록시가 헤더를 살리면 쿼리 쪽은 지운다.
 *
 * @param {string} userId
 * @param {string} accessToken
 * @returns {Promise<{ valid: boolean, userInfo: object|null, cloudStatus: number }>}
 */
const validateSessionViaRobot = async (userId, accessToken) => {
  const query = `userId=${encodeURIComponent(userId)}&accessToken=${encodeURIComponent(accessToken)}`

  return await requestViaRobot(`/api/auth/session?${query}`, {
    method: 'GET',
    headers: { authorization: `Bearer ${accessToken}` }
  })
}

/**
 * refreshToken 으로 accessToken 재발급. 로그인과 같은 이유로 로봇 BE 를 경유한다.
 *
 * 성공: 클라우드 응답 본문(accessToken/refreshToken)
 * 실패: 클라우드 상태/본문을 담은 Error (error.response.status/data)
 *
 * 만료된 accessToken 도 Authorization 헤더로 함께 보낸다 — 클라우드 갱신 API 가 이를 요구한다
 * (@repo/apis 의 client.js 인터셉터도 같은 엔드포인트에 Bearer 를 붙인다). BE 는 이 헤더를 읽어
 * 클라우드 요청에 그대로 전달한다(init-setup-be routes/auth.routes.js).
 *
 * 헤더가 유실되는 경로(validateSessionViaRobot 주석 참고)를 대비해 본문에도 함께 담는다.
 * 이쪽은 POST 라 쿼리가 아닌 본문을 쓰므로 URL 에 토큰이 남지 않는다.
 *
 * @param {string} userId
 * @param {string} refreshToken
 * @param {string} [accessToken] 만료된 accessToken (있으면 Authorization 으로 전달)
 * @returns {Promise<{ accessToken: string, refreshToken?: string }>}
 */
const refreshSessionViaRobot = async (userId, refreshToken, accessToken) => {
  return await requestViaRobot('/api/auth/token/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ userId, refreshToken, ...(accessToken ? { accessToken } : {}) })
  })
}

/**
 * 로봇 BE 대행 라우트 공용 fetch.
 *
 * axios(@repo/apis client)를 쓰지 않는 이유: 그 클라이언트는 세션 accessToken 을 주입하고
 * 401 에서 전역 토큰 갱신/로그아웃 인터셉터를 돌리는데, 로그인 시점에는 세션이 비어 있어
 * 오히려 방해가 된다. 대신 반환/에러 형태만 @repo/apis 와 같게 맞춘다:
 * - 성공: 클라우드 응답 본문 그대로(BE 가 봉투로 감싸지 않고 verbatim 전달한다)
 * - 실패: error.response.data 에 클라우드 에러 본문 (useLogin 이 errorCode 를 메시지 키로 변환)
 */
const requestViaRobot = async (path, init) => {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init })

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
    // useLogin 의 catch 가 error.response.data.errorCode 를 읽는다 — axios 에러 형태로 맞춘다.
    const message = body?.error?.message || body?.message || res.statusText || 'Request failed'
    const error = new Error(`${message} (${res.status})`)
    error.response = { status: res.status, data: body }
    throw error
  }

  return body
}

export { retrieveSiteScope, loginViaRobot, validateSessionViaRobot, refreshSessionViaRobot }
