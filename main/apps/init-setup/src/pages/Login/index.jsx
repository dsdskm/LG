import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { USER_ROLE_LEVEL } from '@repo/constants'
import { LoginPage } from '@repo/ui'
import { loginViaRobot } from '@/apis/dmApis'
import { NETWORK_SETUP_PATH } from '@/hooks/useNetworkGate'
import SvgWifi from '@/assets/wifi.svg'

// init-setup은 TERM_MANAGER 권한을 의도적으로 취급하지 않는다(기본 레벨로 처리).
const { TERM_MANAGER, ...ROLE_LEVEL } = USER_ROLE_LEVEL

// 로그인 화면의 Wi-Fi 설정 바로가기 (언어 선택 좌측 — 공용 LoginPage 의 headerActions 슬롯).
// 로그인은 브라우저 → 클라우드 직통이라 로봇이 외부 Wi-Fi 에 붙어야 성공한다 — 로그인에 실패하는
// 사용자가 여기서 바로 Wi-Fi 를 다시 붙일 수 있어야 한다.
const WifiShortcut = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('route')
  const label = t('SideBar.gnb.network')

  return (
    <button
      type="button"
      onClick={() => navigate(NETWORK_SETUP_PATH)}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.6rem',
        border: 'none',
        borderRadius: 'var(--radius-xs)',
        background: 'transparent',
        // 언어 선택 아이콘과 같은 색을 쓴다(LoginContainer 가 정의하는 변수).
        color: 'var(--login-language-icon-color)',
        cursor: 'pointer'
      }}
    >
      <SvgWifi />
    </button>
  )
}

function Login() {
  // 로그인은 로봇 BE 대행으로만 한다 — 노트북/폰이 로봇 AP 에 붙어 있으면 브라우저에서
  // 클라우드로 나갈 수 없다(utils/networkStatus 의 게이트가 있는 이유와 같은 제약).
  // userInfoFn 은 넘기지 않는다 — BE 가 로그인 대행 시 userRole 조회까지 해서 응답에 userInfo 를
  // 붙여 주므로(init-setup-be services/cloudAuth.service.js) useLogin 이 그걸 그대로 쓴다.
  return (
    <LoginPage
      redirectTo="/language"
      roleLevelMap={ROLE_LEVEL}
      loginFn={loginViaRobot}
      headerActions={<WifiShortcut />}
    />
  )
}

export default Login
