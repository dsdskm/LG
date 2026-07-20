import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getCategoryNode = async (params) => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.CATEGORY_NODE}/retrieve-category`, { params })
    return response
  } catch (error) {
    console.error('Failed to get category tree:', error)
    throw error
  }
}

const createCategoryNode = async (data) => {
  try {
    const response = await axiosCms.post(`${ENDPOINTS.CATEGORY_NODE}/create-category`, data)
    return response
  } catch (error) {
    console.error('Failed to create category tree:', error)
    throw error
  }
}

const updateCategoryNode = async (data) => {
  try {
    const response = await axiosCms.put(`${ENDPOINTS.CATEGORY_NODE}/update-category`, data)
    return response
  } catch (error) {
    console.error('Failed to update category tree:', error)
    throw error
  }
}

export { getCategoryNode, createCategoryNode, updateCategoryNode }
