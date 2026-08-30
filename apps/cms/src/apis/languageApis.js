import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getLanguages = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.LANGUAGE, { params })
    return response
  } catch (error) {
    console.error('Failed to get languages:', error)
    throw error
  }
}

const createLanguage = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.LANGUAGE, data)
    return response
  } catch (error) {
    console.error('Failed to create language:', error)
    throw error
  }
}

const updateLanguage = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.LANGUAGE, data)
    return response
  } catch (error) {
    console.error('Failed to update language:', error)
    throw error
  }
}

const deleteLanguage = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.LANGUAGE, { data })
    return response
  } catch (error) {
    console.error('Failed to delete language:', error)
    throw error
  }
}

export { getLanguages, createLanguage, updateLanguage, deleteLanguage }
