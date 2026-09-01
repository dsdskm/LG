import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathLocations = ENDPOINTS.ROBOT.LOCATIONS

/**
 * Location(권한 코드) 목록 조회
 * @returns {Promise<any>}
 */
export const getLocations = async (params) => {
  params.size = GETSIZE
  const path = pathLocations
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * Location(권한 코드) 조회
 * @returns {Promise<any>}
 */
export const getLocationById = async (locationId) => {
  const path = pathLocations + '/' + locationId
  const response = await axiosRobot.get(path)
  return response
}
