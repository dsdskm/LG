import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathInstallers = ENDPOINTS.ROBOT.INSTALLERS

/**
 * 설치자에게 특정 사이트 할당
 * @returns {Promise<any>}
 */
export const postInstallerSite = async (userId, params) => {
  const path = pathInstallers + '/' + userId
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 설치자로부터 특정 사이트 회수
 * @returns {Promise<any>}
 */
export const deleteInstallerSite = async (userId, params) => {
  const path = pathInstallers + '/' + userId
  const response = await axiosRobot.delete(path, { data: params })
  return response
}

/**
 * 설치자의 설치 가능 사이트 조회
 * @returns {Promise<any>}
 */
export const getInstallerSites = async (userId) => {
  const path = pathInstallers + '/' + userId
  const response = await axiosRobot.get(path)
  return response
}

/**
 * 설치자 목록 조회
 * @returns {Promise<any>}
 */
export const getInstallers = async (params) => {
  params.size = GETSIZE
  const path = pathInstallers
  const response = await axiosRobot.get(path, { params: params })
  return response
}
