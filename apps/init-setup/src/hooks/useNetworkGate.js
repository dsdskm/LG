import { useEffect, useRef } from 'react'
import useRobotOnline from './useRobotOnline'
import useRobotSetupStatus from './useRobotSetupStatus'
import { ROBOT_ONLINE, LOG_TAG, isNetworkGateBypassed } from '@/utils/networkStatus'

/** 로봇이 외부 네트워크에 붙기 전에 가장 먼저 가야 하는 화면. */
export const NETWORK_SETUP_PATH = '/network'

/**
 * 네트워크 설정 우선 게이트.
 *
 * 로그인은 브라우저 → 클라우드 직통이라 로봇이 외부 네트워크에 붙기 전에는 성공할 수 없다.
 * 그래서 로그인 여부와 무관하게 offline 이면 /network 로 먼저 보낸다.
 *
 * 게이트를 걸지 않는 경우:
 * - unknown: Wi-Fi 상태를 못 읽은 것(유선 연결·개발 환경 포함) — 갇히는 쪽이 더 위험하다.
 * - 셋업 완료(status 'completed'): 설치가 끝난 로봇은 초기 설정 그룹이 라우트에서 제거되므로
 *   보낼 /network 자체가 없다.
 * - 사용자가 명시적으로 우회(utils/networkStatus 의 bypass) 한 경우.
 *
 * @returns {{ loading: boolean, state: 'online'|'offline'|'unknown', blocked: boolean }}
 */
const useNetworkGate = () => {
  const { loading: onlineLoading, state } = useRobotOnline()
  const { loading: setupLoading, completed } = useRobotSetupStatus()

  const loading = onlineLoading || setupLoading
  const bypassed = isNetworkGateBypassed()
  const blocked = !loading && state === ROBOT_ONLINE.OFFLINE && !completed && !bypassed

  // 판정 결과는 값이 바뀔 때만 남긴다(렌더마다 찍으면 흐름을 읽을 수 없다).
  const lastLogged = useRef(null)
  useEffect(() => {
    if (loading) return
    const line = `${state}/${blocked}/${completed}/${bypassed}`
    if (lastLogged.current === line) return
    lastLogged.current = line
    console.info(`${LOG_TAG} gate:`, { state, blocked, setupCompleted: completed, bypassed })
  }, [loading, state, blocked, completed, bypassed])

  return { loading, state, blocked }
}

export default useNetworkGate
