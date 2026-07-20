import { client } from '@repo/apis'
import { ENDPOINTS } from '../constants'

const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)
const mockUpData = true //import.meta.env.VITE_MODE !== 'local'

const retrieveUsers = async (orgIds) => {
  if (mockUpData) {
    return new Promise((resolve, reject) => {
      const processedData = []
      for (let i = 1; i <= 30; i++) {
        processedData.push({
          id: i,
          displayName: `Parent Org ${i}(id ${i})`,
          users: [
            { id: i * 2 - 1, displayName: `OTA ${i * 2 - 1}`, userId: `ota${i * 2 - 1}@lge.com`, roleName: 'admin' },
            { id: i * 2, displayName: `OTA ${i * 2}`, userId: `ota${i * 2}@lge.com`, roleName: 'member' }
          ],
          joinedAt: new Date(new Date().getTime() + Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)).toISOString()
        })
      }
      setTimeout(() => {
        resolve({
          message: 'OK',
          error: false,
          code: '0000',
          results: orgIds ? processedData.filter((item) => orgIds.includes(item.id)) : processedData
        })
      }, 500)
    })
  } else {
    try {
      const params = { orgIds }
      const response = await axiosOta.get(ENDPOINTS.ORGANIZATION.BASE, { params })
      return response
    } catch (error) {
      console.error('Failed to retrieve users:', error)
      throw error
    }
  }
}

const updateUserRole = async ({ userId, orgId, roleName }) => {
  if (mockUpData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          message: 'OK',
          error: false,
          code: '0000',
          results: { resultCode: '0000' }
        })
      }, 1000)
    })
  } else {
    try {
      const response = await axiosOta.put(ENDPOINTS.ORGANIZATION.CHANGE_ROLE, { userId, orgId, roleName })
      return response
    } catch (error) {
      console.error('Failed to update user role:', error)
      throw error
    }
  }
}

export { retrieveUsers, updateUserRole }
