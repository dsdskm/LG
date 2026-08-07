import { client } from '@repo/apis'
import { axiosApi, createCrud } from './crudFactory'

// 맵 리소스 CRUD (init-setup-be: /api/v1/maps)
export const { create, list, getById, update, remove } = createCrud('maps')

/**
 * 매핑(SLAM) 제어 API.
 *
 * init-setup-be 가 REST 를 받아 robot-hub gRPC(SendCommand)로 중계한다.
 * 맵 리소스 CRUD(/maps)와 달리 DB 를 건드리지 않는 로봇 명령이므로 경로가 /robot-hub 다.
 *   POST /robot-hub/mapping/start → lio_switch_mode(mode=mapping)
 *   POST /robot-hub/save-map      → lio_save_map(save_path)
 *
 * 시작 / 재시작(reset) / 취소(cancel)는 lio_node 입장에서 모두 같은 호출
 * (switch_mode mode=mapping)이다 — mapping 진입 시 lio_node 가 백엔드를 재생성하고
 * 프론트엔드 상태/격자맵을 초기화하므로 저장하지 않은 데이터는 폐기된다.
 * 그래서 세 동작 모두 /robot-hub/mapping/start 를 호출하고, 의도 구분은 UI 쪽에만 있다.
 *
 * 진행 상태는 이 API 로 폴링하지 않는다 — foxglove-bridge 로 /lio_node/status 를
 * 직접 구독한다(useFoxglove + STATUS_TOPICS).
 */

/**
 * 백엔드 헬스체크 (GET /api/health).
 * @returns {Promise<object>} 헬스 상태 응답
 */
export const healthCheck = async () => {
  return await client('/api').get('/health')
}

/**
 * 저장된 맵 목록 조회 (GET /maps).
 * @param {object} [params] 페이징/필터 (기본 page=1, rows=5)
 * @returns {Promise<{success: boolean, data: object[], total?: number}>}
 */
export const getMaps = async (params = { page: 1, rows: 5 }) => {
  return await axiosApi.get('/maps', { params })
}

/**
 * 매핑 시작 (POST /robot-hub/mapping/start).
 * 새 LC 세션이 열리고 /lio_node/status 가 "mapping" 으로 바뀐다.
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const startMapping = async () => {
  return await axiosApi.post('/robot-hub/mapping/start', {})
}

/**
 * 진행 중인 매핑 결과를 새 맵으로 저장 (POST /robot-hub/save-map).
 *
 * 저장 위치는 백엔드가 LIO_MAP_BASE_DIR(기본 /ws/maps) 하위로 결정한다 — name 만 넘긴다.
 * @param {{name?: string}} [payload] name 미지정 시 백엔드가 map_YYMMDD_HHMMSS 로 생성
 * @returns {Promise<{success: boolean, data: {name: string, savePath: string, message: string}}>}
 */
export const createMapping = async (payload = {}) => {
  return await axiosApi.post('/robot-hub/save-map', payload)
}

/**
 * 기존 맵을 재매핑 결과로 갱신 (POST /robot-hub/save-map).
 *
 * 백엔드에 덮어쓰기 전용 엔드포인트는 없다 — 같은 name 으로 저장하면 그 디렉터리를 갱신한다.
 * 갱신 대상이 특정돼야 하므로 name 은 필수다.
 * @param {{name: string}} payload 갱신할 맵 이름 (필수)
 * @returns {Promise<{success: boolean, data: {name: string, savePath: string, message: string}}>}
 */
export const modifyMapping = async (payload) => {
  if (!payload?.name) {
    throw new Error('name is required to overwrite an existing map')
  }
  return await axiosApi.post('/robot-hub/save-map', payload)
}

/**
 * 매핑 재시작 (POST /robot-hub/mapping/start). 수집 중인 맵 데이터를 버리고 새 세션을 시작한다.
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const resetMapping = async () => {
  return await axiosApi.post('/robot-hub/mapping/start', {})
}

/**
 * 매핑 취소 (POST /robot-hub/mapping/start). 저장하지 않고 매핑 세션을 폐기한다.
 * (전용 cancel 서비스가 없어 mapping 재진입으로 폐기한다 — reset 과 같은 호출이다.)
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const cancelMapping = async () => {
  return await axiosApi.post('/robot-hub/mapping/start', {})
}
