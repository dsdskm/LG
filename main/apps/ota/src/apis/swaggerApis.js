import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const getSwagger = async () => {
  const response = await axiosOta.get(ENDPOINTS.SWAGGER)
  return response
}

export { getSwagger }
