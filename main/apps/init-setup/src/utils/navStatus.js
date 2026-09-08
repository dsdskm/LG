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
 * 상태 값 → 배지에 쓸 번역 키(map 네임스페이스).
 *
 * 발행 값은 액션 서버의 상태 이름이라(RUNNING, STOPPED …) 조작자가 읽을 대상이 아니다.
 * 목록에 없는 값은 원문을 그대로 보여준다(아래 stateLabel) — 발행 측에 상태가 새로 늘었을 때
 * 배지가 비는 것보다 낫다.
 */
const NAV_STATE_LABEL_KEYS = {
  IDLE: 'navState.idle',
  RUNNING: 'navState.running',
  DONE: 'navState.done',
  STOPPED: 'navState.stopped',
  FAILED: 'navState.failed'
}

const SPIN_STATE_LABEL_KEYS = {
  IDLE: 'spinState.idle',
  RUNNING: 'spinState.running',
  DONE: 'spinState.done',
  STOPPED: 'spinState.stopped',
  TIMEOUT: 'spinState.timeout',
  ERROR: 'spinState.error'
}

const stateLabel = (keys, state, t) => {
  const key = keys[String(state).trim().toUpperCase()]
  return key ? t(key) : state
}

/**
 * 배지/버튼에 표시할 회전 요약. 진행 중이면 목표 대비 현재 각도를 보여준다.
 * @param {object|null} spinStatus parseSpinStatus 결과
 * @param {(key: string) => string} t map 네임스페이스의 번역 함수
 * @returns {string|null} 상태 수신 전이면 null
 */
// 발행 측은 아직 측정 전인 값을 null 로 채운다(target_deg/actual_deg) — Number(null) 은 0 이라
// 그대로 쓰면 "0/360°" 처럼 측정된 것처럼 보인다. null/빈값은 NaN 으로 떨어뜨려 구분한다.
const toNumberOrNaN = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value))

export const summarizeSpinStatus = (spinStatus, t) => {
  const state = spinStatus?.state
  if (!state) return null
  const label = stateLabel(SPIN_STATE_LABEL_KEYS, state, t)
  const target = toNumberOrNaN(spinStatus?.target_deg)
  const actual = toNumberOrNaN(spinStatus?.actual_deg)
  // 각도는 숫자만으로 읽히므로 그대로 붙인다(단위 기호는 언어와 무관하다).
  if (spinStatus.active && Number.isFinite(target)) {
    return Number.isFinite(actual)
      ? `${label} (${actual.toFixed(0)}/${target.toFixed(0)}°)`
      : `${label} (${target.toFixed(0)}°)`
  }
  return label
}

/** 단일 이동 또는 크루즈가 진행 중인지. */
export const isNavMoving = (navStatus) => Boolean(navStatus?.goto?.active || navStatus?.cruise?.active)

/**
 * 배지 등에 표시할 요약 문자열. 진행 중이면 남은 거리를 함께 보여준다.
 * 상태 수신 전이면 null 을 반환하므로 호출 측에서 대기 문구를 쓰면 된다.
 * @param {{cruise: object|null, goto: object|null}|null} navStatus
 * @param {(key: string, options?: object) => string} t map 네임스페이스의 번역 함수
 * @returns {string|null}
 */
export const summarizeNavStatus = (navStatus, t) => {
  if (!navStatus) return null
  // 단일 이동을 먼저 본다 — nav_goto 는 진입 시 크루즈를 정지시키므로 둘이 동시에 active 일 수 없다.
  const active = (navStatus.goto?.active && navStatus.goto) || (navStatus.cruise?.active && navStatus.cruise) || null
  const state = active?.state || navStatus.goto?.state || navStatus.cruise?.state || null
  if (!state) return null

  const label = stateLabel(NAV_STATE_LABEL_KEYS, state, t)
  const distance = Number(active?.distance_remaining)
  // 남은 거리는 "3.2 m 남음" 처럼 어순이 언어마다 달라 문구까지 번역에 맡긴다.
  return active && Number.isFinite(distance) && distance > 0
    ? `${label} (${t('navState.remaining', { distance: distance.toFixed(1) })})`
    : label
}
