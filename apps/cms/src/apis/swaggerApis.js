import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getSwagger = async () => {
  const response = await axiosCms.get(ENDPOINTS.SWAGGER)
  return response
}

export { getSwagger }
