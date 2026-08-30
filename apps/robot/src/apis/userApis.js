import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathUsers = ENDPOINTS.ROBOT.USERS

/**
 * 사용자 목록 조회
 * @returns {Promise<any>}
 */
export const getUsers = async (params) => {
  params.size = GETSIZE
  const path = pathUsers
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 사용자 역할 수정
 * @returns {Promise<any>}
 */
export const patchUserRole = async (userId, params) => {
  const path = pathUsers + '/' + userId + '/role'
  const response = await axiosRobot.patch(path, params)
  return response
}

/**
 * 사용자 정보 수정
 * @returns {Promise<any>}
 */
export const patchUser = async (userId, params) => {
  const path = pathUsers + '/' + userId
  const response = await axiosRobot.patch(path, params)
  return response
}

/**
 * 사용자 삭제
 * @returns {Promise<any>}
 */
export const deleteUser = async (userId) => {
  const path = pathUsers + '/' + userId
  const response = await axiosRobot.delete(path)
  return response
}
