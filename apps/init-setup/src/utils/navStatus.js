/**
 * 주행(Nav2) 상태 파싱.
 *
 * corepath 의 nav_action_command_handler 가 /robot_hub/nav_action_status 에
 * std_msgs/String 으로 JSON 을 실어 발행한다:
 *   { "cruise": { active, state, waypoints, total, loops_done, distance_remaining, message, ... },
 *     "goto_status": { active, state, target, distance_remaining, message } }
 *
 * state 값: IDLE | RUNNING | DONE | STOPPED | FAILED
 */

/**
 * 토픽 payload(String.data)를 { cruise, goto } 로 파싱한다. 값이 없거나 JSON 이 깨지면 null.
 * @param {string|object|null|undefined} raw std_msgs/String 의 data 필드
 * @returns {{cruise: object|null, goto: object|null}|null}
 */
export const parseNavStatus = (raw) => {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    // 발행 측 키 이름이 goto_status 다 — 소비 측에서는 goto 로 줄여 쓴다.
    return { cruise: parsed?.cruise ?? null, goto: parsed?.goto_status ?? null }
  } catch {
    return null
  }
}

/**
 * 제자리 회전 상태 파싱 (/robot_hub/nav_spin_status).
 *
 * motor-2wheel 의 WheelCommandHandler 가 발행한다:
 *   { active, state, target_deg, actual_deg, message }
 * state: IDLE | RUNNING | DONE | STOPPED | TIMEOUT | ERROR
 *
 * @param {string|object|null|undefined} raw std_msgs/String 의 data 필드
 * @returns {{active: boolean, state: string, target_deg: number|null, actual_deg: number|null, message: string}|null}
 */
export const parseSpinStatus = (raw) => {
  if (!raw) return null
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

/** 회전 진행 중인지. */
export const isSpinning = (spinStatus) => Boolean(spinStatus?.active)

/**
 * 배지/버튼에 표시할 회전 요약. 진행 중이면 목표 대비 현재 각도를 보여준다.
 * @returns {string|null} 상태 수신 전이면 null
 */
// 발행 측은 아직 측정 전인 값을 null 로 채운다(target_deg/actual_deg) — Number(null) 은 0 이라
// 그대로 쓰면 "0/360°" 처럼 측정된 것처럼 보인다. null/빈값은 NaN 으로 떨어뜨려 구분한다.
const toNumberOrNaN = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value))

export const summarizeSpinStatus = (spinStatus) => {
  const state = spinStatus?.state
  if (!state) return null
  const target = toNumberOrNaN(spinStatus?.target_deg)
  const actual = toNumberOrNaN(spinStatus?.actual_deg)
  if (spinStatus.active && Number.isFinite(target)) {
    return Number.isFinite(actual)
      ? `${state} (${actual.toFixed(0)}/${target.toFixed(0)}°)`
      : `${state} (${target.toFixed(0)}°)`
  }
  return state
}

/** 단일 이동 또는 크루즈가 진행 중인지. */
export const isNavMoving = (navStatus) => Boolean(navStatus?.goto?.active || navStatus?.cruise?.active)

/**
 * 배지 등에 표시할 요약 문자열. 진행 중이면 남은 거리를 함께 보여준다.
 * 상태 수신 전이면 null 을 반환하므로 호출 측에서 대기 문구를 쓰면 된다.
 * @param {{cruise: object|null, goto: object|null}|null} navStatus
 * @returns {string|null}
 */
export const summarizeNavStatus = (navStatus) => {
  if (!navStatus) return null
  // 단일 이동을 먼저 본다 — nav_goto 는 진입 시 크루즈를 정지시키므로 둘이 동시에 active 일 수 없다.
  const active = (navStatus.goto?.active && navStatus.goto) || (navStatus.cruise?.active && navStatus.cruise) || null
  const state = active?.state || navStatus.goto?.state || navStatus.cruise?.state || null
  if (!state) return null

  const distance = Number(active?.distance_remaining)
  return active && Number.isFinite(distance) && distance > 0 ? `${state} (${distance.toFixed(1)} m)` : state
}
