import { client } from '@repo/apis'
import { generateUuid36, getTimestampSec } from '@repo/utils'
import { ENDPOINTS } from './constants'
import i18next from 'i18next'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const axiosDm = client(import.meta.env.VITE_DM_API_BASE_URL)

const retrieveDevices = async (orgIds, id) => {
  const data = { orgIds }
  if (id) data.id = String(id)
  try {
    const response = await axiosOta.post(ENDPOINTS.DEVICE.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to retrieve devices:', error)
    throw error
  }
}

const retrieveDeviceStatus = async (deviceId, params) => {
  const i18n = i18next.default || i18next
  const config = {
    ...params,
    headers: {
      ...params?.headers,
      timestamp: getTimestampSec(),
      'message-id': generateUuid36(),
      'language-code': i18n.language
    }
  }
  try {
    const response = await axiosDm.get(
      deviceId ? `${ENDPOINTS.DEVICE.STATUS}/${deviceId}` : `${ENDPOINTS.DEVICE.STATUS}`,
      config
    )
    return response
  } catch (error) {
    console.error('Failed to retrieve device status:', error)
    throw error
  }
}

export { retrieveDevices, retrieveDeviceStatus }
