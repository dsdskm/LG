import createClient from './client'
import { ENDPOINTS } from './constants'

const axiosOta = createClient(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveCompany = async (userId) => {
  const params = { userId }
  try {
    const response = await axiosOta.get(ENDPOINTS.COMPANY, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve company:', error)
    throw error
  }
}

const retrieveOrganizationUser = async (ids) => {
  const params = { ids }
  try {
    const response = await axiosOta.get(ENDPOINTS.ORGANIZATION.USER_DETAIL, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve organization user:', error)
    throw error
  }
}

const retrieveOrganizationTree = async ({ id, userId }) => {
  const params = { userId }
  if (id) params.id = String(id)
  try {
    const response = await axiosOta.get(ENDPOINTS.ORGANIZATION.TREE, { params })
    return response
  } catch (error) {
    console.error('Failed to retrieve organization tree:', error)
    throw error
  }
}

const saveOrganization = async (data) => {
  try {
    const response = await axiosOta.put(ENDPOINTS.ORGANIZATION.BASE, data)
    return response
  } catch (error) {
    console.error('Failed to save organization:', error)
    throw error
  }
}

const requestJoin = async ({ id, userId }) => {
  try {
    const response = await axiosOta.post(ENDPOINTS.ORGANIZATION.JOIN, { data: { id, userId } })
    return response
  } catch (error) {
    console.error('Failed to request join:', error)
    throw error
  }
}

const withdraw = async ({ id, userId }) => {
  try {
    const response = await axiosOta.post(ENDPOINTS.ORGANIZATION.WITHDRAW, { data: { id, userId } })
    return response
  } catch (error) {
    console.error('Failed to withdraw:', error)
    throw error
  }
}

const sendResponse = async ({ id, userId, isApproved, reason }) => {
  try {
    const response = await axiosOta.post(ENDPOINTS.ORGANIZATION.JOIN, { data: { id, userId, isApproved, reason } })
    return response
  } catch (error) {
    console.error('Failed to send response:', error)
    throw error
  }
}

export const organizationApis = {
  retrieveCompany,
  retrieveOrganizationUser,
  retrieveOrganizationTree,
  saveOrganization,
  requestJoin,
  withdraw,
  sendResponse
}
