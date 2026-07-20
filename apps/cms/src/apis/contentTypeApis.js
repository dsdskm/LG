import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getContentTypes = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.CONTENT_TYPE, { params })
    return response
  } catch (error) {
    console.error('Failed to get content types:', error)
    throw error
  }
}

const createContentType = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.CONTENT_TYPE, data)
    return response
  } catch (error) {
    console.error('Failed to create content type:', error)
    throw error
  }
}

const updateContentType = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.CONTENT_TYPE, data)
    return response
  } catch (error) {
    console.error('Failed to update content type:', error)
    throw error
  }
}

const deleteContentType = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.CONTENT_TYPE, { data })
    return response
  } catch (error) {
    console.error('Failed to delete content type:', error)
    throw error
  }
}

export { getContentTypes, createContentType, updateContentType, deleteContentType }
