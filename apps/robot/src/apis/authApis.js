import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathAuth = ENDPOINTS.ROBOT.AUTH

/**
 * 사용자 승인 요청 목록 조회
 * @returns {Promise<any>}
 */
export const getSignupRequests = async (params) => {
  params.size = GETSIZE
  const path = pathAuth + '/signup/requests'
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 사용자 가입 승인
 * @returns {Promise<any>}
 */
export const approveSignupRequest = async (temporaryUserId, params) => {
  const path = pathAuth + '/signup/requests/' + temporaryUserId + '/approve'
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 사용자 가입 거절
 * @returns {Promise<any>}
 */
export const rejectSignupRequest = async (temporaryUserId, params) => {
  const path = pathAuth + '/signup/requests/' + temporaryUserId + '/reject'
  const response = await axiosRobot.post(path, params)
  return response
}
