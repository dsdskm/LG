import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathMaps = ENDPOINTS.ROBOT.MAPS

/**
 * 맵 목록 조회
 */
export const getMaps = async (params = {}) => {
  const response = await axiosRobot.get(pathMaps, {
    params: { size: GETSIZE, ...params }
  })
  return response
}

/**
 * 맵 상세 조회
 */
export const getMapDetail = async (mapId) => {
  const response = await axiosRobot.get(`${pathMaps}/${mapId}`)
  return response
}

/**
 * 맵 생성
 */
export const createMap = async (body) => {
  const response = await axiosRobot.post(pathMaps, body)
  return response
}

/**
 * 맵 정보 수정
 */
export const updateMap = async (mapId, body) => {
  const response = await axiosRobot.put(`${pathMaps}/${mapId}`, body)
  return response
}

/**
 * 맵 삭제
 */
export const deleteMap = async (mapId) => {
  const response = await axiosRobot.delete(`${pathMaps}/${mapId}`)
  return response
}

/**
 * 맵 금지구역 수정
 */
export const updateMapZones = async (mapId, zones) => {
  const response = await axiosRobot.put(`${pathMaps}/${mapId}/zones`, { zones })
  return response
}

/**
 * 맵 배포
 */
export const deployMap = async (mapId, body) => {
  const response = await axiosRobot.post(`${pathMaps}/${mapId}/deploy`, body)
  return response
}

/**
 * 맵 배포 상태 조회
 */
export const getDeployStatus = async (mapId, deployId) => {
  const response = await axiosRobot.get(`${pathMaps}/${mapId}/deploy/${deployId}`)
  return response
}

/**
 * 조건 기반 맵 뷰 데이터 조회
 */
export const getMapViewFind = async (params) => {
  const path = pathMaps + '/view/find'
  const response = await axiosRobot.post(path, params)
  return response
}
