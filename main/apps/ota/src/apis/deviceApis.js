import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const axiosDm = client(import.meta.env.VITE_DM_API_BASE_URL)

const retrieveDevices = async (orgIds, id) => {
  const params = { orgIds }
  if (id) params.id = String(id)
  try {
    const response = await axiosOta.get(ENDPOINTS.DEVICE.BASE, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve devices:', error)
    throw error
  }
}

const retrieveDeviceStatus = async (deviceId, params) => {
  try {
    const response = await axiosDm.get(
      deviceId ? `${ENDPOINTS.DEVICE.STATUS}/${deviceId}` : `${ENDPOINTS.DEVICE.STATUS}`,
      params
    )
    return response
  } catch (error) {
    console.error('Failed to retrieve device status:', error)
    throw error
  }
}

export { retrieveDevices, retrieveDeviceStatus }
