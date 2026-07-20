import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getLabels = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.LABEL, { params })
    return response
  } catch (error) {
    console.error('Failed to get labels:', error)
    throw error
  }
}

const createLabel = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.LABEL, data)
    return response
  } catch (error) {
    console.error('Failed to create label:', error)
    throw error
  }
}

const updateLabel = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.LABEL, data)
    return response
  } catch (error) {
    console.error('Failed to update label:', error)
    throw error
  }
}

const deleteLabel = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.LABEL, { data })
    return response
  } catch (error) {
    console.error('Failed to delete label:', error)
    throw error
  }
}

export { getLabels, createLabel, updateLabel, deleteLabel }
