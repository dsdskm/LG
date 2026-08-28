import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@repo/stores'
import { getUserInfo } from '@repo/apis'
import useNetworkGate, { NETWORK_SETUP_PATH } from '@/hooks/useNetworkGate'
import { LOG_TAG } from '@/utils/networkStatus'

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

          const userInfo = await getUserInfo(userId, accessToken)
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
        // Case 2: No query parameters
        const session = useUserStore.getState().session
        if (session?.accessToken && session?.userId) {
          try {
            const userInfo = await getUserInfo(session.userId, session.accessToken)
            if (userInfo) {
              navigate(resolvedLandingPath, { replace: true })
            } else {
              navigate('/login', { replace: true })
            }
          } catch (error) {
            console.error('Validation failed for stored session:', error)
            navigate('/login', { replace: true })
          } finally {
            setIsValidating(false)
          }
        } else {
          // No stored session
          navigate('/login', { replace: true })
          setIsValidating(false)
        }
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
