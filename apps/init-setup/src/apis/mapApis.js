import { axiosApi, axiosHealthApi, createCrud } from './crudFactory'

// 맵 리소스 CRUD (init-setup-be: /api/v1/maps)
export const { create, list, getById, update, remove } = createCrud('maps')

export const uploadMap = async (body) => {
  return await axiosApi.post('/maps/upload', body)
}

export const uploadPoi = async (body) => {
  return await axiosApi.post('/map-pois/upload-mapserver', body)
}

/**
 * 매핑(SLAM) 제어 API.
 *
 * init-setup-be 가 REST 를 받아 robot-hub gRPC(SendCommand)로 중계한다.
 * 맵 리소스 CRUD(/maps)와 달리 DB 를 건드리지 않는 로봇 명령이므로 경로가 /robot-hub 다.
 *   POST /robot-hub/mapping/start → lio_switch_mode(mode=mapping)
 *   POST /robot-hub/save-map      → lio_save_map(save_path)
 * 예외로 POST /robot-hub/save-map/publish 는 로봇 명령이 아니라 BE 의 파일 작업이다
 * (작업본 디렉터리 rename + 맵 레코드 경로 갱신). 경로만 같은 그룹에 있다.
 *
 * 시작 / 재시작(reset) / 취소(cancel)는 lio_node 입장에서 모두 같은 호출
 * (switch_mode mode=mapping)이다 — mapping 진입 시 lio_node 가 백엔드를 재생성하고
 * 프론트엔드 상태/격자맵을 초기화하므로 저장하지 않은 데이터는 폐기된다.
 * 그래서 세 동작 모두 /robot-hub/mapping/start 를 호출하고, 의도 구분은 UI 쪽에만 있다.
 *
 * 진행 상태는 이 API 로 폴링하지 않는다 — 텔레메트리 릴레이로 /lio_node/status 를
 * 직접 구독한다(useTelemetry + STATUS_TOPICS).
 */

/**
 * 백엔드 헬스체크 (GET /api/health).
 * @returns {Promise<object>} 헬스 상태 응답
 */
export const healthCheck = async () => {
  return await axiosHealthApi.get('/health')
}

/**
 * 저장된 맵으로 측위 전환 (POST /robot-hub/switch-mode).
 *
 * lio_node 가 3D 맵을 로드하고 재정위를 시작한다 — 응답은 "맵 로드 완료" 시점에 돌아오고
 * 재정위 완료는 /lio_node/status 가 "ready" 가 되는 것으로 판단한다(중간: loading_map →
 * relocalizing_pose|relocalizing_gkr → loading_grid_map → ready).
 * 이동(nav_goto)은 이 상태가 ready 여야 의미가 있다.
 *
 * @param {{mapPath: string, setInitialPose?: boolean, x?: number, y?: number, z?: number, yaw?: number}} payload
 *   mapPath: lio_node 가 보는 맵 디렉터리 경로(맵 레코드의 imagePath 가 있는 폴더).
 *   setInitialPose: true 면 x/y/z/yaw(도) 를 초기 추정 위치로 준다(생략 시 GKR 360° 재정위).
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const loadMapForLocalization = async ({ mapPath, setInitialPose, x, y, z, yaw } = {}) => {
  if (!mapPath) throw new Error('mapPath is required to switch to localization')
  return await axiosApi.post('/robot-hub/switch-mode', {
    mode: 'localization',
    map_path: mapPath,
    ...(setInitialPose ? { set_initial_pose: true, x, y, z, yaw } : {})
  })
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
 * 저장 산출물 확인 (GET /robot-hub/save-map/artifacts).
 *
 * save_map 응답은 3D 맵 저장까지만 보장한다 — 2D 격자맵(grid_map.yaml/.png)은 lio_node 가
 * 응답을 돌려준 뒤 save_grid_map 을 fire-and-forget 으로 호출하므로 파일로만 확인할 수 있다.
 *
 * @param {string} name 확인할 맵 이름
 * @returns {Promise<{success: boolean, data: {name: string, savePath: string, readable: boolean,
 *   exists: boolean, gridMap: {ready: boolean, yaml: string|null, image: string|null}, files: string[]}}>}
 */
export const getSaveArtifacts = async (name) => {
  return await axiosApi.get('/robot-hub/save-map/artifacts', { params: { name } })
}

/**
 * 2D 격자맵 파일이 생길 때까지 폴링한다. 저장 완료 모달에서 "격자맵까지 떨어졌는지" 표시용.
 *
 * 판정 불가(readable=false — 백엔드가 맵 루트를 마운트하지 않은 환경)나 타임아웃은
 * 실패로 다루지 않는다 — 3D 맵 저장 자체는 이미 성공한 상태이므로 상태만 구분해 돌려준다.
 *
 * @param {string} name 맵 이름
 * @param {{timeoutMs?: number, intervalMs?: number}} [options]
 * @returns {Promise<{state: 'ready'|'pending'|'unknown', artifacts: object|null}>}
 */
export const waitForGridMap = async (name, { timeoutMs = 20000, intervalMs = 1000 } = {}) => {
  const deadline = Date.now() + timeoutMs
  let artifacts = null

  for (;;) {
    try {
      const response = await getSaveArtifacts(name)
      artifacts = response?.data ?? null
      if (artifacts?.readable === false) return { state: 'unknown', artifacts }
      if (artifacts?.gridMap?.ready) return { state: 'ready', artifacts }
    } catch {
      // 확인 API 실패는 저장 실패가 아니다 — 판정 불가로 끝낸다.
      return { state: 'unknown', artifacts }
    }
    if (Date.now() >= deadline) return { state: 'pending', artifacts }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

/**
 * 작업본 맵을 확정본으로 승격 (POST /robot-hub/save-map/publish).
 *
 * 매핑 저장은 '<난수 8자>_working' 디렉터리에 떨어진다(utils/mapRecord.newWorkingMapDirName —
 * 표시용 이름은 레코드 name.default 가 갖는다). 업로드 단계에서 이 API 가
 * 접미사를 뗀 디렉터리로 rename 하고, 그 디렉터리를 가리키던 맵 레코드의 경로/이름도 BE 가 함께
 * 갱신한다. 파일 이동이라 robot-hub 를 거치지 않는다(로봇 명령이 아니다).
 *
 * 전역 에러 팝업을 끈다(skipErrorPopup) — 409(이미 확정본 존재)는 덮어쓰기 확인으로 이어져야 하고
 * 나머지도 화면에서 상황별 토스트로 안내하는 편이 낫다.
 *
 * @param {{name?: string, savePath?: string, overwrite?: boolean}} payload
 *   name: 작업본 맵 이름, savePath: 작업본 디렉터리 절대 경로(둘 중 하나 필수).
 *   overwrite: 같은 이름의 확정본이 있을 때 교체 여부(기존 확정본은 .bak-<ts> 로 보존).
 * @returns {Promise<{success: boolean, data: {name: string, savePath: string, previousPath: string,
 *   backupPath: string|null, maps: number[]}}>}
 */
export const publishMap = async ({ name, savePath, overwrite = false } = {}) => {
  if (!name && !savePath) throw new Error('name or savePath is required to publish a map')
  return await axiosApi.post(
    '/robot-hub/save-map/publish',
    { ...(name ? { name } : {}), ...(savePath ? { save_path: savePath } : {}), overwrite },
    { skipErrorPopup: true }
  )
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
