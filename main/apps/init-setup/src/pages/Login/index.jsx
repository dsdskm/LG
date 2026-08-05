import { USER_ROLE_LEVEL } from '@repo/constants'
import { LoginPage } from '@repo/ui'

// init-setup은 TERM_MANAGER 권한을 의도적으로 취급하지 않는다(기본 레벨로 처리).
const { TERM_MANAGER, ...ROLE_LEVEL } = USER_ROLE_LEVEL

function Login() {
  return <LoginPage redirectTo="/language" roleLevelMap={ROLE_LEVEL} />
}

export default Login
