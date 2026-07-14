import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrievePolicy = async (orgIds, id) => {
  const params = { orgIds }
  if (id) {
    params.id = id
  }
  const response = await axiosOta.get(ENDPOINTS.POLICY, { params })
  return response
}

const savePolicy = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.POLICY, data)
    return response
  } catch (error) {
    console.error('Failed to create policy:', error)
    throw error
  }
}

const deletePolicies = async (ids) => {
  const params = { ids }
  try {
    const response = await axiosOta.delete(ENDPOINTS.POLICY, { params })
    return response
  } catch (error) {
    console.error('Failed to delete policies:', error)
    throw error
  }
}

export { retrievePolicy, savePolicy, deletePolicies }
