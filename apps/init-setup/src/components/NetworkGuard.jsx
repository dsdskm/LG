import React from 'react'
import { Navigate } from 'react-router-dom'
import useNetworkGate, { NETWORK_SETUP_PATH } from '@/hooks/useNetworkGate'
import { LOG_TAG } from '@/utils/networkStatus'

/**
 * 네트워크 설정 우선 게이트 (로그인 화면 앞단).
 *
 * 로그인 요청은 브라우저에서 클라우드로 직접 나가므로 로봇이 외부 네트워크에 붙기 전에는
 * 로그인 화면을 띄워도 할 수 있는 게 없다 — /network 로 보낸다.
 * '/' 진입은 RootGuard 가 같은 판정을 먼저 하고, 이 컴포넌트는 그 밖의 경로(URL 직접 진입,
 * 401 인터셉터의 window.location.href = '/login')로 로그인 화면에 닿는 경우를 막는다.
 */
const NetworkGuard = ({ children }) => {
  const { loading, blocked } = useNetworkGate()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
    )
  }

  if (blocked) {
    console.info(`${LOG_TAG} NetworkGuard → ${NETWORK_SETUP_PATH} (login needs the robot online)`)
    return <Navigate to={NETWORK_SETUP_PATH} replace />
  }

  return children
}

export default NetworkGuard
