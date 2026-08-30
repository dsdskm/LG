import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getCategoryTree = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.CATEGORY_TREE, { params })
    return response
  } catch (error) {
    console.error('Failed to get category tree:', error)
    throw error
  }
}

const createCategoryTree = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.CATEGORY_TREE, data)
    return response
  } catch (error) {
    console.error('Failed to create category tree:', error)
    throw error
  }
}

const updateCategoryTree = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.CATEGORY_TREE, data)
    return response
  } catch (error) {
    console.error('Failed to update category tree:', error)
    throw error
  }
}

const deleteCategoryTree = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.CATEGORY_TREE, { data })
    return response
  } catch (error) {
    console.error('Failed to delete category tree:', error)
    throw error
  }
}

export { getCategoryTree, createCategoryTree, updateCategoryTree, deleteCategoryTree }
