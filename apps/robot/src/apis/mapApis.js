import { robotClient } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathMaps = ENDPOINTS.ROBOT.MAPS

/**
 * 9. 맵 목록 검색 (페이지네이션) — POST /maps/search
 * body: { groupId, siteId, buildingId?, floorId?, areaId?, deviceId?, mapType?, page, size }
 * @returns mapServer(SearchResponse): { items[], page, size, totalCount, totalPages, hasNext, hasPrev }
 */
export const searchMaps = async (body = {}) => {
  const response = await axiosRobot.post(`${pathMaps}/search`, body)
  return response?.mapServer ?? {}
}

/**
 * 3. 맵 정보 및 최신 버전 조회 — GET /maps/{mapId}
 * @returns mapServer(MapObject): { mapId, mapScope, createdAt, updatedAt, latestVersions[] }
 */
export const getMap = async (mapId, mapType) => {
  const response = await axiosRobot.get(`${pathMaps}/${mapId}`, {
    params: mapType ? { mapType } : {}
  })
  return response?.mapServer ?? null
}

/**
 * 10. 맵 뷰 데이터 조회 — GET /maps/{mapId}/view
 * @returns mapServer(MapViewResponse): { mapId, mapScope, navi, poi }
 */
export const getMapView = async (mapId) => {
  const response = await axiosRobot.get(`${pathMaps}/${mapId}/view`)
  return response?.mapServer ?? null
}

/**
 * 11. 조건 기반 맵 뷰 데이터 조회 — POST /maps/view/find
 * (로봇 상세/대시보드에서 device·site 조건으로 사용)
 */
export const getMapViewFind = async (params) => {
  const response = await axiosRobot.post(`${pathMaps}/view/find`, params)
  return response
}

/**
 * 맵 전체 버전 이력 조회 — GET /maps/{mapId}/versions
 * 응답 mapServer: { mapId, mapScope, items[] }
 *   items[]: { versionId, mapType, status, description, filename, fileSize,
 *              baseNaviVersionId(POI/SVG가 종속된 NAVI 버전, NAVI는 null),
 *              createdAt, updatedAt, isLatest }
 */
export const getMapVersions = async (mapId, params = {}) => {
  const response = await axiosRobot.get(`${pathMaps}/${mapId}/versions`, { params })
  return response?.mapServer ?? response ?? null
}

/**
 * 5. 특정 버전 다운로드 (전체 정보) — GET /maps/versions/{versionId}/download-url
 * @returns mapServer: { versionId, mapId, mapScope, mapType, filename, fileSize,
 *   metadata(navi일 때 origin/resolution/image/negate/thresholds), downloadUrl }
 */
export const getVersionDownload = async (versionId) => {
  const response = await axiosRobot.get(`${pathMaps}/versions/${versionId}/download-url`)
  return response?.mapServer ?? null
}

/**
 * 5. 특정 버전 다운로드 URL만 — GET /maps/versions/{versionId}/download-url
 * @returns presigned 다운로드 URL(string) 또는 null
 */
export const getVersionDownloadUrl = async (versionId) => {
  const response = await axiosRobot.get(`${pathMaps}/versions/${versionId}/download-url`)
  return response?.mapServer?.downloadUrl ?? null
}

/**
 * 1. 맵 업로드용 Pre-signed URL 생성 — POST /maps/upload-url
 * body: { groupId?, siteId?, buildingId?, floorId?, areaId?, deviceId?, mapType, filename, description? }
 * @returns mapServer: { mapId, mapScope, versionId, mapType, uploadUrl }
 */
export const createUploadUrl = async (body) => {
  const response = await axiosRobot.post(`${pathMaps}/upload-url`, body)
  return response?.mapServer ?? null
}

/**
 * 2. 맵 업로드 완료 — POST /maps/{mapId}/versions/{versionId}/upload-complete
 * @returns mapServer: { versionId, mapId, mapScope, mapType, status }
 */
export const completeUpload = async (mapId, versionId) => {
  const response = await axiosRobot.post(`${pathMaps}/${mapId}/versions/${versionId}/upload-complete`)
  return response?.mapServer ?? null
}
