import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveTargetGroup = async (orgIds, id = null) => {
  const params = { orgIds }
  if (id) params.id = String(id)
  const response = await axiosOta.get(`${ENDPOINTS.TARGETGROUP}`, { params })
  return response
}

const saveGroup = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.TARGETGROUP, data)
    return response
  } catch (error) {
    console.error('Failed to create group:', error)
    throw error
  }
}

export { retrieveTargetGroup, saveGroup }
