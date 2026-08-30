import { USER_ROLE_LEVEL } from '@repo/constants'
import { LoginPage } from '@repo/ui'
import { loginViaRobot } from '@/apis/dmApis'

// init-setup은 TERM_MANAGER 권한을 의도적으로 취급하지 않는다(기본 레벨로 처리).
const { TERM_MANAGER, ...ROLE_LEVEL } = USER_ROLE_LEVEL

function Login() {
  // 로그인은 로봇 BE 대행으로만 한다 — 노트북/폰이 로봇 AP 에 붙어 있으면 브라우저에서
  // 클라우드로 나갈 수 없다(utils/networkStatus 의 게이트가 있는 이유와 같은 제약).
  // userInfoFn 은 넘기지 않는다 — BE 가 로그인 대행 시 userRole 조회까지 해서 응답에 userInfo 를
  // 붙여 주므로(init-setup-be services/cloudAuth.service.js) useLogin 이 그걸 그대로 쓴다.
  return <LoginPage redirectTo="/language" roleLevelMap={ROLE_LEVEL} loginFn={loginViaRobot} />
}

export default Login
