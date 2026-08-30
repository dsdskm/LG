import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getContentSubs = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.CONTENT_SUB, { params })
    return response
  } catch (error) {
    console.error('Failed to get content subs:', error)
    throw error
  }
}

const getContentSubDetail = async (id) => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.CONTENT_SUB}/${id}`)
    return response
  } catch (error) {
    console.error('Failed to get content sub detail:', error)
    throw error
  }
}

const createContentSub = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.CONTENT_SUB, data)
    return response
  } catch (error) {
    console.error('Failed to create content sub:', error)
    throw error
  }
}

const updateContentSub = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.CONTENT_SUB, data)
    return response
  } catch (error) {
    console.error('Failed to update content sub:', error)
    throw error
  }
}

const deleteContentSub = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.CONTENT_SUB, { data })
    return response
  } catch (error) {
    console.error('Failed to delete content sub:', error)
    throw error
  }
}

export { getContentSubs, getContentSubDetail, createContentSub, updateContentSub, deleteContentSub }
