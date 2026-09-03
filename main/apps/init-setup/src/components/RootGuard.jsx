import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@repo/stores'
import { getUserInfo } from '@repo/apis'
import useNetworkGate, { NETWORK_SETUP_PATH } from '@/hooks/useNetworkGate'
import { LOG_TAG } from '@/utils/networkStatus'
import { ensureSession, clearSessionForLogin, SESSION_STATE } from '@/utils/session'
import { validateSessionViaRobot } from '@/apis/dmApis'

// 세션 검증 후 착지할 경로. App 이 robotSetup.currentStep 으로 계산해 내려준다
// (초기 설정이 끝난 로봇은 '초기 설정' 메뉴가 없어 맵 설정 첫 화면이 된다).
// 셋업 조회 실패 등으로 값이 없으면 첫 단계로 보낸다 — 단계를 건너뛰는 쪽이 더 위험하다.
const FALLBACK_LANDING_PATH = '/language'

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

function getUserLevel(userRole) {
  let returnLevel = 0
  switch (userRole) {
    case 'SYSTEM_ADMIN':
      returnLevel = 3
      break
    case 'SYSTEM_MANAGER':
      returnLevel = 2
      break
    case 'GROUP_MANAGER':
      returnLevel = 1
      break
    case 'SITE_MANAGER':
      returnLevel = 0
      break
  }
  return returnLevel
}

/**
 * 콘솔에서 넘겨받은 accessToken 의 사용자 정보를 가져온다.
 *
 * 1차는 로봇 BE 대행 라우트(/api/auth/session) — 노트북/폰이 로봇 setup AP 에 붙어 있으면
 * 브라우저는 클라우드로 직접 나갈 수 없다(apis/dmApis.js 주석 참고). /session 은 유효성 판정과
 * userInfo 를 함께 돌려주므로 별도 사용자 조회가 필요 없다.
 *
 * 2차는 클라우드 직통 폴백. 원격 콘솔(robot-proxy) 경유 진입에서는 Authorization 헤더가 BE 까지
 * 닿지 않아 /session 이 400(accessToken 누락)으로 떨어진다 — 이 진입 경로는 브라우저가 이미
 * 인터넷에 붙어 있으므로 직통이 성공한다. 프록시/BE 가 헤더를 살리면 이 폴백은 지워도 된다.
 *
 * 단, /session 이 valid:false 로 명확히 거절한 경우(토큰 만료 등)는 폴백하지 않는다 —
 * 판정이 이미 났으므로 로그인 화면으로 보내는 것이 맞다.
 */
const resolveUserInfo = async (userId, accessToken) => {
  try {
    const { valid, userInfo } = await validateSessionViaRobot(userId, accessToken)
    if (valid && userInfo) return userInfo
    if (valid === false) return null
  } catch (error) {
    console.warn('[RootGuard] session lookup via robot BE failed — falling back to cloud:', error.message)
  }

  return await getUserInfo(userId, accessToken)
}

const RootGuard = ({ landingPath }) => {
  const navigate = useNavigate()
  const resolvedLandingPath = landingPath || FALLBACK_LANDING_PATH
  const [searchParams] = useSearchParams()
  const [isValidating, setIsValidating] = useState(true)
  // 로봇이 외부 네트워크에 붙기 전에는 로그인(브라우저 → 클라우드)이 불가능하다.
  // 세션 검증보다 이 판정이 먼저다 — 로그인 여부와 무관하게 /network 로 보낸다.
  const { loading: networkLoading, blocked: networkBlocked } = useNetworkGate()

  useEffect(() => {
    const validateSession = async () => {
      const accessToken = searchParams.get('accessToken')
      const userId = searchParams.get('userId')

      // Case 1: Query parameters exist
      if (accessToken) {
        try {
          // const decoded = decodeJwt(accessToken)
          if (!userId) {
            console.error('Could not extract userId from accessToken')
            navigate('/login', { replace: true })
            return
          }

          const userInfo = await resolveUserInfo(userId, accessToken)
          if (userInfo) {
            // Save to useUserStore
            useUserStore.getState().login({
              email: userInfo.userEmail,
              accessToken,
              userId,
              userRole: userInfo.userRole,
              userLevel: getUserLevel(userInfo.userRole)
            })
            navigate(resolvedLandingPath, { replace: true })
          } else {
            navigate('/login', { replace: true })
          }
        } catch (error) {
          console.error('Validation failed for query params:', error)
          navigate('/login', { replace: true })
        } finally {
          setIsValidating(false)
        }
      } else {
        // Case 2: No query parameters — 저장된 세션을 확인한다.
        // 확인·갱신은 로봇 BE 를 경유한다(utils/session) — 브라우저가 로봇 AP 에 붙어 있으면
        // 클라우드로 직접 갈 수 없다. 만료면 refreshToken 으로 갱신하고, 갱신까지 실패하면
        // 세션을 비우고 '/login?sessionout=Y' 로 보내 기존 만료 안내 토스트를 띄운다.
        const state = await ensureSession()
        if (state === SESSION_STATE.EXPIRED) {
          navigate(clearSessionForLogin(), { replace: true })
        } else {
          navigate(resolvedLandingPath, { replace: true })
        }
        setIsValidating(false)
      }
    }

    // 판정이 끝나기 전에 세션 검증을 시작하면 offline 인데 /login 으로 먼저 튀어버린다.
    if (networkLoading) return

    // 로그인 콜백(?accessToken=…)으로 돌아온 경우는 게이트로 끊지 않는다 — 토큰을 버리면 세션이
    // 사라진다. 검증은 그대로 하고, 착지 경로는 App 이 이미 /network 로 내려준다(offline 이면).
    if (networkBlocked && !searchParams.get('accessToken')) {
      console.info(`${LOG_TAG} RootGuard → ${NETWORK_SETUP_PATH} (robot offline, session check skipped)`)
      navigate(NETWORK_SETUP_PATH, { replace: true })
      setIsValidating(false)
      return
    }

    validateSession()
  }, [searchParams, navigate, resolvedLandingPath, networkLoading, networkBlocked])

  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
    )
  }

  return null
}

export default RootGuard
