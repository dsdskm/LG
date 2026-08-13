import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@repo/stores'
import { getUserInfo } from '@repo/apis'
import { fetchRobotSetupCompleted } from '@/hooks/useRobotSetupStatus'

// 초기 설정이 끝난 로봇은 '초기 설정' 메뉴가 없으므로 맵 설정의 첫 화면으로 들어간다.
const resolveLandingPath = async () => ((await fetchRobotSetupCompleted()) ? '/map/scan' : '/language')

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

const RootGuard = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isValidating, setIsValidating] = useState(true)

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
            navigate(await resolveLandingPath(), { replace: true })
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
              navigate(await resolveLandingPath(), { replace: true })
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

    validateSession()
  }, [searchParams, navigate])

  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
    )
  }

  return null
}

export default RootGuard
