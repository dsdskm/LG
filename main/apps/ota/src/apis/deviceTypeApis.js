import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveDeviceTypes = async (companyId, id) => {
  try {
    const params = {}
    if (companyId) {
      params.companyId = companyId
    }
    if (id) {
      params.id = id
    }

    const response = await axiosOta.get(ENDPOINTS.DEVICE_TYPE, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve devices:', error)
    throw error
  }
}

const saveDeviceType = async (params) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.DEVICE_TYPE, params)
    return response
  } catch (error) {
    console.error('Failed to save device type:', error)
    throw error
  }
}

export { retrieveDeviceTypes, saveDeviceType }
