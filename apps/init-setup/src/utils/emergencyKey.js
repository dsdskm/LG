/**
 * 비상정지 버튼(하드웨어 키) 상태 판정 — /emergency_key_status.
 *
 * 발행자는 power-on-micom 이고, CAN 0x700 프레임을 받을 때마다(약 1Hz) uint8 하나를 내보낸다.
 *   0 = Released (풀림)
 *   1 = Detected (눌림 / locked)
 *
 * 0x700 은 주기 발행이라 "미수신" 자체가 상태 이상 판정 근거다. 그래서 마지막 값이 아무리
 * 오래됐어도 그대로 쓰지 않고, 일정 시간 이상 끊기면 released/locked 가 아닌 unknown 으로 본다:
 *   - locked 를 붙잡아 두면 마이컴/브릿지가 죽은 순간의 값이 화면에 영구히 남아 조작이 잠긴다.
 *   - released 로 낙관하면 실제로 눌려 있는 로봇을 움직이려 할 수 있다.
 * 그러므로 unknown 은 "막지도, 눌리지 않았다고 단정하지도 않는" 상태로 다룬다 —
 * 조작을 막는 근거는 locked 뿐이다(isEmergencyKeyLocked). power-on-micom 이 없는 구성
 * (시뮬레이터·부분 브링업)에서도 화면이 잠기지 않아야 하기 때문이다.
 */

/** 이 시간 넘게 수신이 없으면 상태 불명으로 본다 — 1Hz 발행 기준 3회 연속 누락. */
export const EMERGENCY_KEY_STALE_MS = 3000

export const EMERGENCY_KEY_LOCKED = 'locked'
export const EMERGENCY_KEY_RELEASED = 'released'
export const EMERGENCY_KEY_UNKNOWN = 'unknown'

/**
 * 수신한 메시지와 수신 시각으로 버튼 상태를 판정한다.
 *
 * @param {{emergency_key?: number}|null} [message] cdrParser 가 해석한 EmergencyKeyStatus
 * @param {number|null} [updatedAt] 마지막 수신 시각(ms). useTelemetry 의 customTopicsUpdatedAt.
 * @param {number} [now] 판정 기준 시각(ms). 테스트/타이머 재판정용.
 * @returns {{state: string, value: number|null, stale: boolean}}
 *   value 는 stale 이어도 마지막으로 받은 원본 값을 남긴다(진단용 표시).
 */
export function resolveEmergencyKeyState({ message, updatedAt, now = Date.now() } = {}) {
  const value = typeof message?.emergency_key === 'number' ? message.emergency_key : null

  // 한 번도 받지 못했다 — 토픽이 없는 구성일 수도 있고 아직 첫 샘플 전일 수도 있다.
  if (value === null || !updatedAt) return { state: EMERGENCY_KEY_UNKNOWN, value: null, stale: false }

  if (now - updatedAt > EMERGENCY_KEY_STALE_MS) return { state: EMERGENCY_KEY_UNKNOWN, value, stale: true }

  return { state: value !== 0 ? EMERGENCY_KEY_LOCKED : EMERGENCY_KEY_RELEASED, value, stale: false }
}

/** 조작을 막아야 하는지 — 눌려 있다고 확인된 경우만이다(unknown 은 막지 않는다). */
export const isEmergencyKeyLocked = (state) => state === EMERGENCY_KEY_LOCKED
