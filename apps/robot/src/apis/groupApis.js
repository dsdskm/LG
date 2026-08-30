import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathGroups = ENDPOINTS.ROBOT.GROUPS

/**
 * 그룹 목록 조회
 * @returns {Promise<any>}
 */
export const getGroups = async (params) => {
  params.size = GETSIZE
  const path = pathGroups
  const response = await axiosRobot.get(path, { params: params })
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
