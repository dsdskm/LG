import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getGroups = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.GROUP, { params })
    return response
  } catch (error) {
    console.error('Failed to get groups:', error)
    throw error
  }
}

const createGroup = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.GROUP, data)
    return response
  } catch (error) {
    console.error('Failed to create group:', error)
    throw error
  }
}

const updateGroup = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.GROUP, data)
    return response
  } catch (error) {
    console.error('Failed to update group:', error)
    throw error
  }
}

const deleteGroup = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.GROUP, { data })
    return response
  } catch (error) {
    console.error('Failed to delete group:', error)
    throw error
  }
}

export { getGroups, createGroup, updateGroup, deleteGroup }
