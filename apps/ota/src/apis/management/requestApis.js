import { client } from '@repo/apis'
import { ENDPOINTS } from '../constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const mockUpData = true //import.meta.env.VITE_MODE !== 'local'

const retrieveRequest = async (ids) => {
  if (mockUpData) {
    return new Promise((resolve) => {
      const statuses = ['ready', 'process', 'success', 'fail']
      const processedData = []
      for (let i = 1; i <= 30; i++) {
        processedData.push({
          id: i,
          organization: { id: (i % 3) + 1, displayName: `Organization ${(i % 3) + 1}` },
          status: statuses[(i - 1) % 4],
          reason: i % 4 === 3 ? `Reason for failure ${i}` : '',
          requestedDate: new Date().getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)
        })
      }
      setTimeout(() => {
        resolve({ message: 'OK', error: false, code: '0000', results: processedData })
      }, 500)
    })
  } else {
    try {
      const response = await axiosOta.get(ENDPOINTS.ORGANIZATION.REQUEST, { ids })
      return response
    } catch (error) {
      console.error('Failed to retrieve requests:', error)
      throw error
    }
  }
}

const saveRequest = async (data) => {
  if (mockUpData) {
    return { message: 'OK', error: false, code: '0000', results: data }
  } else {
    try {
      const response = await axiosOta.post(ENDPOINTS.ORGANIZATION.REQUEST, data)
      return response
    } catch (error) {
      console.error('Failed to save request:', error)
      throw error
    }
  }
}

export { retrieveRequest, saveRequest }
