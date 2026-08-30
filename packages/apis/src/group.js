import createClient from './robotClient'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = createClient(import.meta.env.VITE_AUTH_API_BASE_URL)
const pathGroups = ENDPOINTS.ROBOT.GROUPS

/**
 * 그룹 목록 조회
 * @returns {Promise<any>}
 */
export const getGroups = async (params = {}) => {
  const queryParams = { ...params, size: GETSIZE }
  const path = pathGroups
  const response = await axiosRobot.get(path, { params: queryParams })
  return response
}

/**
 * 그룹 생성
 * @returns {Promise<any>}
 */
export const postGroups = async (params) => {
  const path = pathGroups
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 그룹 수정
 * @returns {Promise<any>}
 */
export const putGroups = async (groupId, params) => {
  const path = pathGroups + '/' + groupId
  const response = await axiosRobot.put(path, params)
  return response
}

export const groupApis = {
  getGroups,
  postGroups,
  putGroups
}
