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

/**
 * 로봇 메시(URDF STL 등) CDN 다운로드 인증 — configs/cloid/<모델명> 단위로 전체 파일 목록 + cdnBaseUrl 조회
 * (서버가 cloid/ 아래를 URDF의 <robot name="..."> 값(모델명) 단위 폴더로 나눠둠)
 * @returns {Promise<{ cdnBaseUrl: string, version: string, files: { name: string, url: string }[], expiresAt: string }>}
 */
const getMeshDownloadAuth = async (configId, modelName) => {
  // 응답이 쿠키(Set-Cookie)로 CDN 접근 권한을 내려주는 방식 → withCredentials 필요(브라우저가 쿠키를 저장/전송하도록)
  // 실서버 확인 결과 이 엔드포인트는 GET만 지원(메일의 --data '' 예시와 달리 POST는 405)
  const response = await axiosRobot.get(`${pathFiles}/configs/cloid/${modelName}/download-auth`, {
    //임시로 configId 대신 cloid 로 하드코딩
    withCredentials: true
  })
  return response
}

export { getFiles, getFilesDownloardurl, getMeshDownloadAuth }
