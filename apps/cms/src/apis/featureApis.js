import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

// admin 진입 비밀번호 검증 — 실패(틀림)는 화면 내 처리하므로 전역 에러모달 억제(skipErrorPopup)
const verify = async (password) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.FEATURE}/verify`, { password }, { skipErrorPopup: true })
    return response
  } catch (error) {
    console.error('Failed to verify admin password:', error)
    throw error
  }
}

const getCatalog = async () => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.FEATURE}/catalog`)
    return response
  } catch (error) {
    console.error('Failed to get feature catalog:', error)
    throw error
  }
}

// 메뉴 제어용 — 활성화된 featureKey 배열. 조용히 실패(메뉴만 기본 OFF 처리)하도록 skipErrorPopup.
const getEnabled = async (params) => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.FEATURE}/enabled`, { params, skipErrorPopup: true })
    return response
  } catch (error) {
    console.error('Failed to get enabled features:', error)
    throw error
  }
}

const getFlags = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.FEATURE, { params })
    return response
  } catch (error) {
    console.error('Failed to get feature flags:', error)
    throw error
  }
}

const setFlag = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.FEATURE, data)
    return response
  } catch (error) {
    console.error('Failed to set feature flag:', error)
    throw error
  }
}

export { verify, getCatalog, getEnabled, getFlags, setFlag }
