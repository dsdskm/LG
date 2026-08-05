import { robotClient } from '@repo/apis'
import { ENDPOINTS, GETSIZE } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathTerms = ENDPOINTS.ROBOT.TERMS

// 약관 전문이 저장된 CDN(S3) 베이스 URL. 환경변수가 없으면 환경별 기본값 사용
const TERMS_CDN_BASE_URL =
  import.meta.env.VITE_TERMS_CDN_BASE_URL ||
  (import.meta.env.MODE === 'production' ? 'https://terms.hcrsp.com' : 'https://terms.qa.hcrsp.com')

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

/**
 * 약관 전문(마크다운) 조회. objectKeyPrefix + 언어로 CDN 상의 .md 파일을 가져온다
 * @returns {Promise<string>}
 */
export const getTermContent = async (objectKeyPrefix, lang) => {
  const url = `${TERMS_CDN_BASE_URL}/${objectKeyPrefix}${lang}.md`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`약관 전문 조회 실패 (${response.status})`)
  return response.text()
}
