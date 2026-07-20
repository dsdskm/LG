import { client } from '@repo/apis'
import { ENDPOINTS } from '../constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const mockUpData = true //import.meta.env.VITE_MODE !== 'local'

const retrieveApproves = async (ids) => {
  try {
    if (mockUpData) {
      return new Promise((resolve, reject) => {
        const processedData = []
        for (let i = 1; i <= 30; i++) {
          processedData.push({
            id: i,
            userId: `User ${i}@lge.com`,
            organization: {
              id: i,
              displayName: `Organization ${i}`
            },
            requestedAt: new Date(
              new Date().getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)
            ).toISOString()
          })
        }
        setTimeout(() => {
          resolve({
            message: 'OK',
            error: false,
            code: '0000',
            results: ids ? processedData.filter((item) => ids?.includes(item?.organization?.id)) : processedData
          })
        }, 500)
      })
    } else {
      const response = await axiosOta.get(ENDPOINTS.ORGANIZATION.APPROVE, { ids })
      return response
    }
  } catch (error) {
    console.error('Failed to retrieve approve:', error)
    throw error
  }
}

const saveApprove = async (data) => {
  try {
    if (mockUpData) {
      return { message: 'OK', error: false, code: '0000', results: data }
    } else {
      const response = await axiosOta.post(ENDPOINTS.ORGANIZATION.APPROVE, data)
      return response
    }
  } catch (error) {
    console.error('Failed to create approve:', error)
    throw error
  }
}

export { retrieveApproves, saveApprove }
