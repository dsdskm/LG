import { client } from '@repo/apis'
import { ENDPOINTS } from '@/apis/constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrievePackageTypes = async (companyId) => {
  try {
    const params = { companyId }
    const response = await axiosOta.get(ENDPOINTS.PACKAGE_TYPE, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve packaging:', error)
    throw error
  }
}

export { retrievePackageTypes }
