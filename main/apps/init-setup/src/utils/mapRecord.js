/**
 * 맵 레코드(POST /maps) 본문 조립.
 *
 * save_map 은 파일만 만들고 DB 레코드는 만들지 않는다. 레코드가 없으면 시맨틱 화면이 그 구역의
 * 맵을 못 찾아(POI 소속 mapId / 맵 로드 경로) 작업이 이어지지 않으므로, 저장 직후 등록한다.
 *
 * 값의 출처가 셋으로 나뉜다:
 *   1) 저장 응답            — savePath (→ imagePath/yamlPath)
 *   2) grid_map.yaml 메타   — resolution/origin/mode/negate/occupied_thresh/free_thresh
 *      (BE 가 파일을 읽어 artifacts.gridMap.meta 로 준다. OccupancyGrid 메시지에는 없는 값이고,
 *       threshold 는 로봇 설정값이라 추측하면 틀린다)
 *   3) 화면 상태            — siteId(선택된 건물), areaId(선택된 구역), name(위치로 만든 맵 이름)
 *
 * yaml 을 못 읽는 환경(맵 루트 미마운트)에서는 살아 있는 OccupancyGrid 의 info 로 resolution/origin/
 * 크기까지는 채우고, yaml 전용 값(mode/negate/threshold)은 **넣지 않는다** — 기본값을 찍어 넣으면
 * 실제 저장 파일과 다른 메타가 DB 에 남는다(BE 컬럼은 nullable).
 */

/** 쿼터니언 → yaw(rad). OccupancyGrid origin.orientation 에서 회전만 뽑는다. */
const yawOfQuaternion = (q) => {
  if (!q) return 0
  return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/**
 * @param {object} params
 * @param {string} params.savePath 저장 디렉터리 (save-map 응답의 savePath)
 * @param {string} params.name 맵 이름 (위치 계층으로 만든 값)
 * @param {number|string} [params.siteId] 선택된 건물의 siteId
 * @param {number|string} [params.areaId] 선택된 구역 id
 * @param {object|null} [params.meta] artifacts.gridMap.meta (grid_map.yaml 파싱 결과)
 * @param {object|null} [params.info] 살아 있는 OccupancyGrid 의 info (meta 가 없을 때 폴백)
 * @param {string} [params.gridImageFile] 이미지 파일명 (기본 grid_map.png — meta.image 우선)
 * @returns {{body: object|null, missing: string[]}}
 *   body: POST /maps 본문. 필수값(resolution)을 못 구하면 null.
 *   missing: 채우지 못한 필드 목록 — 호출 측이 사용자에게 알릴 수 있도록 돌려준다.
 */
export const buildMapRecordBody = ({ savePath, name, siteId, areaId, meta = null, info = null, gridImageFile }) => {
  const missing = []
  const dir = String(savePath || '').replace(/\/+$/, '')
  if (!dir) return { body: null, missing: ['savePath'] }

  const imageFile = meta?.image || gridImageFile || 'grid_map.png'
  const body = {
    name: { default: name },
    frame_id: 'map',
    imagePath: `${dir}/${imageFile}`,
    yamlPath: `${dir}/grid_map.yaml`
  }

  if (siteId) body.siteId = siteId
  else missing.push('siteId')
  if (areaId) body.areaId = areaId
  else missing.push('areaId')

  // resolution / origin — yaml 이 정본, 없으면 살아 있는 지도 메시지에서.
  if (isNumber(meta?.resolution)) body.resolution = meta.resolution
  else if (isNumber(info?.resolution)) body.resolution = info.resolution
  else missing.push('resolution')

  if (Array.isArray(meta?.origin) && meta.origin.length >= 2) {
    body.origin = [meta.origin[0], meta.origin[1], meta.origin[2] ?? 0]
  } else if (info?.origin?.position) {
    body.origin = [info.origin.position.x, info.origin.position.y, yawOfQuaternion(info.origin.orientation)]
  } else {
    missing.push('origin')
  }

  // 격자 크기는 메시지에만 있다(yaml 에는 없다).
  if (isNumber(info?.width)) body.imageWidth = info.width
  if (isNumber(info?.height)) body.imageHeight = info.height

  // yaml 전용 값 — 없으면 생략한다(추측 금지).
  if (meta?.mode) body.mode = meta.mode
  else missing.push('mode')
  if (isNumber(meta?.negate)) body.negate = meta.negate
  else missing.push('negate')
  if (isNumber(meta?.occupied_thresh)) body.occupied_thresh = meta.occupied_thresh
  else missing.push('occupied_thresh')
  if (isNumber(meta?.free_thresh)) body.free_thresh = meta.free_thresh
  else missing.push('free_thresh')

  // BE 필수: name / resolution / imagePath. resolution 이 없으면 등록 자체가 400 이다.
  if (!isNumber(body.resolution)) return { body: null, missing }
  return { body, missing }
}
