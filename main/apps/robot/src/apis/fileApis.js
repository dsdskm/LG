import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const isRefactoryTemp = import.meta.env.VITE_BE_REFACTORY_TEMP
  ? import.meta.env.VITE_BE_REFACTORY_TEMP == 'Y'
    ? true
    : false
  : false
const pathFiles = isRefactoryTemp ? '/api/v1/files' : ENDPOINTS.ROBOT.FILES

/**
 * 파일 목록 조회
 * @returns {Promise<any>}
 */
const getFiles = async (params) => {
  const path = pathFiles
  const response = await axiosRobot.get(path, { params: params })
  return response
}

/**
 * 파일 다운로드 URL 조회
 * @returns {Promise<any>}
 */
const getFilesDownloardurl = async (fieldId) => {
  const response = await axiosRobot.get(pathFiles + '/' + fieldId + '/download-url')
  return response
}

export { getFiles, getFilesDownloardurl }
