import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathTerms = ENDPOINTS.ROBOT.TERMS

/**
 * 약관 등록을 위한 presigned url 생성
 * @returns {Promise<any>}
 */
export const postUploadUrl = async (params) => {
  const path = pathTerms + '/upload-url'
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 약관 등록
 * @returns {Promise<any>}
 */
export const postTerms = async (params) => {
  const path = pathTerms
  const response = await axiosRobot.post(path, params)
  return response
}

/**
 * 약관 목록 조회
 * @returns {Promise<any>}
 */
export const getTerms = async (params) => {
  params.size = GETSIZE
  const path = pathTerms
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 약관 수정
 * @returns {Promise<any>}
 */
export const patchTerms = async (termId, params) => {
  const path = pathTerms + '/' + termId
  const response = await axiosRobot.patch(path, params)
  return response
}
