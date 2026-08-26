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

/** 작업 중인(아직 업로드 전) 맵임을 나타내는 저장 이름 접미사. 승격 시 이 접미사를 뗀다. */
export const WORKING_SUFFIX = 'working'

/**
 * 화면에 노출할 맵만 남긴다 — archived 는 업로드로 대체된 이전 맵이라 목록에서 뺀다.
 *
 * 레코드를 지우지 않고 남겨 두므로(되돌릴 여지) 걸러내지 않으면 사이트마다 옛 맵이 계속 쌓여
 * 보인다. GET /maps 는 status 를 단일값으로만 필터하고 "archived 제외" 는 표현할 수 없으므로,
 * BE 는 전량을 내려주고 화면에서 이 함수로 뺀다.
 *
 * @param {object[]} maps GET /maps 응답의 data
 * @returns {object[]} status 가 archived 가 아닌 맵
 */
export const visibleMaps = (maps) => (maps ?? []).filter((map) => map?.status !== 'archived')

/** 맵 산출물 파일 확장자 — 레코드 값이 파일 경로인지 판단하는 기준. */
const MAP_FILE_EXT = /\.(png|pgm|yaml|yml|pcd|txt|bin)$/i

/**
 * save_map 이 맵 디렉터리 안에 만드는 산출물 파일 이름(확장자 제외).
 * 이 이름들이면 파일이 곧 디렉터리 소속이므로 상위 폴더가 맵 디렉터리다.
 */
const MAP_ARTIFACT_NAMES = new Set(['grid_map', 'global_map', 'map', 'optimized_trajectory', 'frontend_trajectory'])

/**
 * 맵 레코드에서 맵 디렉터리(lio_switch_mode 의 map_path)를 얻는다.
 *
 * save_map 은 맵 하나를 디렉터리 단위로 저장하고(global_map.pcd + optimized_trajectory.txt +
 * grid_map.*), loadMap 은 그 디렉터리에 '/global_map.pcd' 를 붙여 찾는다
 * (gtsam_backend.cpp). 반면 레코드의 imagePath 는 BE 가 검증하지 않아 형태가 세 가지로 들어온다:
 *
 *   1) /ws/maps/<맵이름>                    (디렉터리)          → 그대로
 *   2) /ws/maps/<맵이름>/grid_map.png       (디렉터리 안 산출물) → 상위 폴더
 *   3) /ws/maps/<맵이름>.pgm                (맵 이름이 곧 파일명) → 확장자만 제거
 *
 * 3) 을 2) 처럼 다루면 /ws/maps 까지만 남아 맵 로드가 실패한다 — 마지막 세그먼트가
 * 산출물 이름(grid_map 등)인지로 2) 와 3) 을 가른다.
 */
export const resolveMapDir = (record) => {
  const raw = record?.imagePath || record?.yamlPath
  if (!raw) return ''
  // 후행 슬래시는 제거한다 — loadMap 은 '/'를 붙여 이어붙이므로 있으나 없으나 동작하지만
  // 마지막 세그먼트 판정이 빈 문자열이 되는 것을 막는다.
  const normalized = String(raw).replace(/\\/g, '/').replace(/\/+$/, '')
  if (!normalized) return ''

  const idx = normalized.lastIndexOf('/')
  const lastSegment = idx >= 0 ? normalized.slice(idx + 1) : normalized

  // 1) 확장자가 없으면 디렉터리로 본다.
  if (!MAP_FILE_EXT.test(lastSegment)) return normalized

  const baseName = lastSegment.replace(MAP_FILE_EXT, '')
  // 2) 디렉터리 안의 산출물 파일 → 상위 폴더가 맵 디렉터리.
  if (MAP_ARTIFACT_NAMES.has(baseName.toLowerCase())) return idx > 0 ? normalized.slice(0, idx) : ''
  // 3) 파일명이 곧 맵 이름 → 확장자만 떼면 맵 디렉터리.
  return idx > 0 ? `${normalized.slice(0, idx)}/${baseName}` : baseName
}

/** 아직 승격되지 않은 작업본 디렉터리인지. */
export const isWorkingMapDir = (dir) => new RegExp(`_${WORKING_SUFFIX}$`).test(String(dir || ''))

/** 작업본 디렉터리가 승격되면 갖게 되는 맵 이름(마지막 세그먼트에서 접미사 제거). */
export const publishedNameOf = (dir) =>
  String(dir || '')
    .split('/')
    .pop()
    .replace(new RegExp(`_${WORKING_SUFFIX}$`), '')

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
    yamlPath: `${dir}/grid_map.yaml`,
    // 저장 직후는 아직 작업본(_working)이라 로봇이 쓸 맵이 아니다. 업로드(승격)가 끝나면
    // BE 가 active 로 올리고 같은 사이트의 이전 맵을 archived 로 내린다
    // (init-setup-be map.service.activate). BE 기본값이 'active' 라 여기서 명시해야 한다.
    status: 'inactive'
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
