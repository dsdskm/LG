import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getVectorDbVersions = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.VECTOR_DB, { params })
    return response
  } catch (error) {
    console.error('Failed to get vector db versions:', error)
    throw error
  }
}

const buildVectorDb = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.VECTOR_DB}/build`, data)
    return response
  } catch (error) {
    console.error('Failed to trigger vector db build:', error)
    throw error
  }
}

export { getVectorDbVersions, buildVectorDb }
