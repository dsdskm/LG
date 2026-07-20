import createClient from './robotClient'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = createClient(import.meta.env.VITE_AUTH_API_BASE_URL)
const pathSites = ENDPOINTS.ROBOT.SITES

/**
 * 사이트 목록 조회
 * @returns {Promise<any>}
 */
export const getSites = async (params = {}) => {
  const queryParams = { ...params, size: GETSIZE }
  const path = pathSites
  const response = await axiosRobot.get(path, { params: queryParams })
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
 * 사이트 수정
 * @returns {Promise<any>}
 */
export const putSites = async (siteId, params) => {
  const path = pathSites + '/' + siteId
  const response = await axiosRobot.put(path, params)
  return response
}

export const siteApis = {
  getSites,
  postSites,
  putSites
}
