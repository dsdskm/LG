import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathInvitations = ENDPOINTS.ROBOT.INVITATIONS

/**
 * 초대 목록 조회
 * @returns {Promise<any>}
 */
export const getInvitations = async (params) => {
  params.size = GETSIZE
  const path = pathInvitations
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 초대 생성
 * @returns {Promise<any>}
 */
export const postInvitations = async (params) => {
  const path = pathInvitations
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 초대 취소
 * @returns {Promise<any>}
 */
export const cancelInvitations = async (invitationId, params) => {
  const path = pathInvitations + '/' + invitationId + '/cancel'
  const response = await axiosRobot.post(path, params)
  return response
}
