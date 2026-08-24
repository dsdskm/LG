/**
 * 관제(map-util) applyPoiBatch 요청 body 빌더.
 *
 * 로컬 BE 의 map_pois 행(camelCase: posX/oriW/yawDeg/tolerance…)을 관제 API 의
 * snake_case + 중첩 pose/tolerance 형태로 변환한다. 실제 HTTP 전송/인증은 호출부에서 담당한다.
 */

const deepEqual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** map_pois 행 → 관제 POI(full) 형태. */
export const toControlPoi = (p) => ({
  poi_id: p.poiId,
  name: p.name ?? {},
  type: p.type,
  pose: {
    position: { x: p.posX, y: p.posY, z: p.posZ },
    orientation: { x: p.oriX, y: p.oriY, z: p.oriZ, w: p.oriW }
  },
  yaw_deg: p.yawDeg ?? 0,
  // DB 에는 스칼라 tolerance 만 있어 xy 로 매핑하고, 각도 허용치(yaw_deg)는 0 으로 고정한다.
  tolerance: { xy: p.tolerance ?? 0, yaw_deg: 0 },
  properties: p.properties ?? {}
})

/**
 * 수정된 POI → 관제 update 항목. 원본(originalPoi) 대비 바뀐 필드만 담는다(+ poi_id 항상).
 * 원본을 찾지 못하면 diff 가 불가하므로 full 형태를 반환한다.
 */
export const diffControlPoi = (editedPoi, originalPoi) => {
  if (!originalPoi) return toControlPoi(editedPoi)

  const edited = toControlPoi(editedPoi)
  const original = toControlPoi(originalPoi)
  const out = { poi_id: edited.poi_id }

  for (const key of ['name', 'type', 'pose', 'yaw_deg', 'tolerance', 'properties']) {
    if (!deepEqual(edited[key], original[key])) out[key] = edited[key]
  }
  return out
}

/**
 * applyPoiBatch 요청 body 생성.
 * groupId/siteId/deviceId 는 빈 문자열로 두고 호출부에서 채운다.
 *
 * @param {object} params
 * @param {string|null} params.basePoiVersionId 맵의 poiVersion
 * @param {object[]} params.created  editStatus.created POI 목록
 * @param {object[]} params.edited   editStatus.edited POI 목록
 * @param {object[]} params.deleted  editStatus.softDelete POI 목록
 * @param {Record<string, object>} [params.originalsByPoiId] poiId → 원본 POI(수정 diff 용)
 */
export const buildApplyPoiBatchBody = ({
  basePoiVersionId = null,
  created = [],
  edited = [],
  deleted = [],
  originalsByPoiId = {}
} = {}) => ({
  groupId: '',
  siteId: '',
  deviceId: '',
  basePoiVersionId: basePoiVersionId ?? null,
  create: created.map(toControlPoi),
  update: edited.map((p) => diffControlPoi(p, originalsByPoiId[p.poiId])),
  delete: deleted.map((p) => p.poiId)
})
