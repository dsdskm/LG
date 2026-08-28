import { useEffect, useState } from 'react'
import { getWifiStatus } from '@/apis/wifi'
import { ROBOT_ONLINE, LOG_TAG, deriveRobotOnline } from '@/utils/networkStatus'

/**
 * 로봇의 외부 네트워크 연결 상태(hooks/useRobotSetupStatus 와 같은 모듈 캐시 패턴).
 *
 * 앱 진입 시 여러 곳(App · RootGuard · NetworkGuard)이 같은 값을 보므로 모듈 레벨에 Promise 를
 * 캐시해 요청을 1회로 묶는다. 다만 Wi-Fi 연결은 이 앱 안에서 바뀌는 값이라(네트워크 설정 화면)
 * 캐시를 갱신할 수단이 필요하다 — publishRobotOnline 으로 새 값을 알리면 구독 중인 화면이
 * 로딩 화면을 거치지 않고 함께 바뀐다(로딩으로 되돌리면 Network 화면이 언마운트된다).
 */
let onlinePromise = null
let resolvedState = null
const listeners = new Set()

/** @returns {Promise<'online'|'offline'|'unknown'>} */
export const fetchRobotOnline = () => {
  if (!onlinePromise) {
    onlinePromise = getWifiStatus()
      .then((status) => {
        const state = deriveRobotOnline(status)
        // 게이트가 왜 그렇게 판정했는지는 이 응답 하나로 결정된다 — AP 모드 현장에서
        // 원인을 물어볼 수 없으니 판단 근거(ssid/ipv4/mode)를 그대로 남긴다.
        console.info(`${LOG_TAG} wifi status →`, state, {
          ssid: status?.ssid,
          ipv4: status?.ipv4,
          gateway: status?.gateway,
          mode: status?.mode,
          success: status?.success
        })
        return state
      })
      .catch((error) => {
        // BE 미기동 · 헬퍼 실패 등 — 판정 불가로 두고 게이트를 걸지 않는다.
        console.error(`${LOG_TAG} failed to load robot Wi-Fi status:`, error)
        return ROBOT_ONLINE.UNKNOWN
      })
      .then((state) => {
        resolvedState = state
        return state
      })
  }
  return onlinePromise
}

/**
 * 이미 조회한 상태를 캐시에 반영하고 구독자에게 알린다.
 * (네트워크 설정 화면은 같은 /api/wifi/status 를 이미 읽으므로 재조회 없이 값만 넘긴다)
 * @param {'online'|'offline'|'unknown'} state
 */
export const publishRobotOnline = (state) => {
  if (state !== resolvedState) {
    console.info(`${LOG_TAG} state published:`, resolvedState, '→', state)
  }
  resolvedState = state
  onlinePromise = Promise.resolve(state)
  listeners.forEach((notify) => notify(state))
}

/** @returns {{ loading: boolean, state: 'online'|'offline'|'unknown' }} */
const useRobotOnline = () => {
  const [value, setValue] = useState(() => ({
    loading: resolvedState === null,
    state: resolvedState ?? ROBOT_ONLINE.UNKNOWN
  }))

  useEffect(() => {
    let alive = true

    const apply = (next) => {
      if (!alive) return
      if (next) {
        setValue({ loading: false, state: next })
        return
      }
      fetchRobotOnline().then((state) => {
        if (alive) setValue({ loading: false, state })
      })
    }

    apply(resolvedState)
    listeners.add(apply)
    return () => {
      alive = false
      listeners.delete(apply)
    }
  }, [])

  return value
}

export default useRobotOnline
