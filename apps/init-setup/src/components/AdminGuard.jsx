import { Navigate } from 'react-router-dom'
import { useUserStore } from '@repo/stores'
import { USER_ROLE_LEVEL } from '@repo/constants'

/**
 * admin 라우트 가드.
 *
 * 로그인 세션의 userLevel 이 SYSTEM_MANAGER 이상일 때만 children 을 렌더한다.
 * userLevel 은 로그인 시 RootGuard/useLogin 이 userRole 을 매핑해 세션에 넣어둔 값이다.
 *
 * ⚠️ 이건 UI 차원의 가림막이다. init-setup-be 에는 인증 미들웨어가 없어서
 *    (routes/index.js: "API 키 인증 없음 — 노출 최소화로 대체") BE 에 도달할 수 있는 주체는
 *    이 화면을 거치지 않고도 데이터를 바꿀 수 있다. 실질 보호는 BE 를 loopback 전용으로 두는
 *    배포 설정(INIT_SETUP_BE_BIND_ADDR=127.0.0.1 + FE nginx /api 프록시)이 담당한다.
 */
const AdminGuard = ({ children }) => {
  const session = useUserStore((state) => state.session)
  const isLoggedIn = useUserStore((state) => state.isLoggedIn)

  if (!isLoggedIn || !session?.accessToken) {
    return <Navigate to="/login" replace />
  }
  if ((session.userLevel ?? -1) < USER_ROLE_LEVEL.SYSTEM_MANAGER) {
    // 권한 부족은 로그인 화면이 아니라 첫 화면으로 보낸다(재로그인해도 달라지지 않는 상태).
    return <Navigate to="/language" replace />
  }

  return children
}

export default AdminGuard
