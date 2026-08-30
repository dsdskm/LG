import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveTargetGroup = async (orgIds, id = null) => {
  const data = { orgIds }
  if (id) data.id = String(id)
  const response = await axiosOta.post(`${ENDPOINTS.TARGETGROUP}`, data)
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
