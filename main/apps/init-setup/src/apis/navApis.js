import { axiosApi } from './crudFactory'

/**
 * 주행(Nav2) 이동 명령 API.
 *
 * init-setup-be 가 REST 를 받아 robot-hub gRPC(SendCommand)로 중계하고, 실제 액션 실행은
 * corepath 가 소유한다(nav_action_command_handler.py).
 *   POST /robot-hub/nav/goto      → nav_goto      (/navigate_to_pose 액션 goal)
 *   POST /robot-hub/nav/goto/stop → nav_goto_stop (goal cancel)
 *   POST /robot-hub/nav/stop-all  → nav_stop_all  (단일 이동 + 크루즈 전부 취소)
 *
 * 세 호출 모두 goal 을 걸고 즉시 반환한다 — 도착 여부는 응답으로 알 수 없다.
 * 진행 상태는 /robot_hub/nav_action_status 를 foxglove-bridge 로 구독해서 받는다
 * (constants/topics.js NAV_STATUS_TOPICS + utils/navStatus.js).
 *
 * 전제: 이동 전에 로봇이 측위(localization) 상태여야 한다 — /lio_node/status 가 "ready".
 * 매핑 중에는 map 프레임 기준 목표를 잡을 수 없어 실패한다.
 */

/**
 * 단일 목표 지점 이동 (POST /robot-hub/nav/goto).
 *
 * @param {{x: number, y: number, z?: number, yaw?: number, frameId?: string}} payload
 *   yaw 는 도(degree) 단위. 생략하면 도착 방향을 지정하지 않는다(orientation identity).
 *   frameId 기본값은 백엔드에서 'map'.
 * @returns {Promise<{success: boolean, data: {target: object, frameId: string, message: string}}>}
 */
export const navGoto = async (payload) => {
  return await axiosApi.post('/robot-hub/nav/goto', payload)
}

/**
 * 진행 중인 단일 이동 취소 (POST /robot-hub/nav/goto/stop).
 * 이동 중이 아니어도 성공으로 돌아온다.
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const stopNavGoto = async () => {
  return await axiosApi.post('/robot-hub/nav/goto/stop', {})
}

/**
 * 제자리 회전 (POST /robot-hub/nav/spin).
 *
 * GKR 재정위(/lio_node/status === 'relocalizing_gkr')를 진행시키기 위한 보조 동작이다.
 * 실행은 motor-2wheel 이 /cmd_vel 직접 제어로 처리하므로 측위 전에도 동작한다.
 * 진행 상태는 /robot_hub/nav_spin_status 구독으로 받는다(SPIN_STATUS_TOPICS).
 *
 * @param {{degrees?: number}} [payload] 회전 각도(도, +반시계). 생략 시 백엔드가 360 을 쓴다.
 * @returns {Promise<{success: boolean, data: {degrees: number, message: string}}>}
 */
export const navSpin = async (payload = {}) => {
  return await axiosApi.post('/robot-hub/nav/spin', payload)
}

/**
 * 진행 중인 제자리 회전 정지 (POST /robot-hub/nav/spin/stop).
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const stopNavSpin = async () => {
  return await axiosApi.post('/robot-hub/nav/spin/stop', {})
}

/**
 * 주행 전체 정지 (POST /robot-hub/nav/stop-all). 단일 이동 + 크루즈를 모두 취소한다.
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const stopAllNav = async () => {
  return await axiosApi.post('/robot-hub/nav/stop-all', {})
}
