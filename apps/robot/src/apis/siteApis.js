import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathSites = ENDPOINTS.ROBOT.SITES

/**
 * 사이트 목록 조회
 * @returns {Promise<any>}
 */
export const getSites = async (params) => {
  params.size = GETSIZE
  const path = pathSites
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 사이트 생성
 * @returns {Promise<any>}
 */
export const postSites = async (params) => {
  const path = pathSites
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 사이트 단건 조회 (건물/층/영역 포함)
 * @returns {Promise<any>}
 */
export const getSiteById = async (siteId) => {
  const path = pathSites + '/' + siteId
  const response = await axiosRobot.get(path)
  return response
}

/**
 * 사이트 수정
 * @returns {Promise<any>}
 */
export const putSites = async (siteId, params) => {
  const path = pathSites + '/' + siteId
  const response = await axiosRobot.put(path, params)
  return response
}

/**
 * 사이트 삭제
 * @returns {Promise<any>}
 */
export const deleteSites = async (siteId) => {
  const path = pathSites + '/' + siteId
  const response = await axiosRobot.delete(path)
  return response
}
