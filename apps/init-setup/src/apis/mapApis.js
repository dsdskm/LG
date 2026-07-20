import { client } from '@repo/apis'

const axiosMap = client(import.meta.env.VITE_API_BASE_URL)

const dummy = true

export const healthCheck = async () => {
  return await client('/api').get('/health')
}

export const getMaps = async () => {
  return dummy
    ? new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    : await axiosMap.get('/maps', { params: { page: 1, rows: 5 } })
}
export const startMapping = async () => {
  return dummy ? new Promise((resolve) => setTimeout(() => resolve(), 1000)) : await axiosMap.post('/maps/start')
}
export const createMapping = async () => {
  return dummy ? new Promise((resolve) => setTimeout(() => resolve(), 1000)) : await axiosMap.post('/maps/save')
}
export const modifyMapping = async () => {
  return dummy ? new Promise((resolve) => setTimeout(() => resolve(), 1000)) : await axiosMap.put('/maps/save')
}
export const resetMapping = async () => {
  return dummy ? new Promise((resolve) => setTimeout(() => resolve(), 1000)) : await axiosMap.post('/maps/reset')
}
export const cancelMapping = async () => {
  return dummy ? new Promise((resolve) => setTimeout(() => resolve(), 1000)) : await axiosMap.post('/maps/cancel')
}
