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

export { retrieveSiteScope, loginViaRobot }
