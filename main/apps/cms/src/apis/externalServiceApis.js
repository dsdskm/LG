import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getExternalServices = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.EXTERNAL_SERVICE, { params })
    return response
  } catch (error) {
    console.error('Failed to get external services:', error)
    throw error
  }
}

const createExternalService = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.EXTERNAL_SERVICE, data)
    return response
  } catch (error) {
    console.error('Failed to create external service:', error)
    throw error
  }
}

const updateExternalService = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.EXTERNAL_SERVICE, data)
    return response
  } catch (error) {
    console.error('Failed to update external service:', error)
    throw error
  }
}

const deleteExternalService = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.EXTERNAL_SERVICE, { data })
    return response
  } catch (error) {
    console.error('Failed to delete external service:', error)
    throw error
  }
}

export { getExternalServices, createExternalService, updateExternalService, deleteExternalService }
