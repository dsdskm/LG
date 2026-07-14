// utils/topics.js
// 토픽 이름이 환경/펌웨어 버전마다 다를 수 있어(예: /hmc_ros2_control/* ↔ /ethercat_hardware_interface/*)
// 후보 이름 목록 + 정규식 폴백으로 "실제 존재하는" 토픽 키를 찾아 샘플 배열을 반환한다.
// 기존 이름을 후보 목록 앞에 그대로 두므로 기존 MCAP 호환은 깨지지 않는다.

// diagnostic 토픽 후보 (구: hmc_ros2_control / 신: ethercat_hardware_interface)
export const DIAGNOSTIC_TOPICS = ['/hmc_ros2_control/diagnostic', '/ethercat_hardware_interface/diagnostic']

// actuator_states 토픽 후보
export const ACTUATOR_TOPICS = ['/hmc_ros2_control/actuator_states', '/ethercat_hardware_interface/actuator_states']

// battery 토픽 후보 (sensor_msgs/msg/BatteryState)
export const BATTERY_TOPICS = ['/battery/battery_status']

// rosout 토픽 후보 (rcl_interfaces/msg/Log)
export const ROSOUT_TOPICS = ['/rosout']

// 끝부분 매칭 폴백(후보에 없는 새 prefix가 와도 흡수)
export const DIAGNOSTIC_FALLBACK = /\/diagnostic$/i
export const ACTUATOR_FALLBACK = /\/actuator_states$/i
export const BATTERY_FALLBACK = /(battery_status|battery_state)$/i
export const ROSOUT_FALLBACK = /rosout/i

// samples(토픽→wrapped 배열 객체)에서 실제 존재하는 토픽 키를 반환. 없으면 null.
// - 1순위: 후보 중 비어있지 않은 샘플을 가진 키
// - 2순위: 후보 중 키 자체가 존재(로딩 중 빈 배열 케이스)
// - 3순위: 정규식 폴백으로 키 탐색
export function resolveTopicKey(samples, candidates, fallbackRegex) {
  if (!samples) return null
  for (const name of candidates) {
    if (Array.isArray(samples[name]) && samples[name].length) return name
  }
  for (const name of candidates) {
    if (name in samples) return name
  }
  if (fallbackRegex) {
    const k = Object.keys(samples).find((key) => fallbackRegex.test(key))
    if (k) return k
  }
  return null
}

// 해석된 토픽의 샘플 배열을 반환(없으면 빈 배열).
export function resolveTopicSamples(samples, candidates, fallbackRegex) {
  const key = resolveTopicKey(samples, candidates, fallbackRegex)
  return (key && samples[key]) || []
}
