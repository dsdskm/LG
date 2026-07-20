import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const retrieveAction = async (orgIds, id) => {
  const params = { orgIds }
  if (id) params.id = String(id)
  try {
    const response = await axiosOta.get(ENDPOINTS.ACTION, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve action:', error)
    throw error
  }
}

const saveAction = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.ACTION, data)
    return response
  } catch (error) {
    console.error('Failed to create action:', error)
    throw error
  }
}

const deleteAction = async ({ ids }) => {
  const params = { ids }
  try {
    const response = await axiosOta.delete(ENDPOINTS.ACTION, { params })
    return response
  } catch (error) {
    console.error('Failed to delete action:', error)
    throw error
  }
}

export { retrieveAction, saveAction, deleteAction }
