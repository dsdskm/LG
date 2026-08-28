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
 */
const loginViaRobot = async (userEmail, userPassword) => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ userEmail, userPassword })
  })

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
    const message = body?.error?.message || body?.message || res.statusText || '로그인 실패'
    const error = new Error(`${message} (${res.status})`)
    error.response = { status: res.status, data: body }
    throw error
  }

  return body
}

export { retrieveSiteScope, loginViaRobot }
