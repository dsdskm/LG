import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosCms = client(import.meta.env.VITE_API_BASE_URL)

const getRobotActions = async (params) => {
  try {
    const response = await axiosCms.get(ENDPOINTS.ROBOT_ACTION, { params })
    return response
  } catch (error) {
    console.error('Failed to get robot actions:', error)
    throw error
  }
}

const getRobotActionCodes = async () => {
  try {
    const response = await axiosCms.get(`${ENDPOINTS.ROBOT_ACTION}/codes`)
    return response
  } catch (error) {
    console.error('Failed to get robot action codes:', error)
    throw error
  }
}

const createRobotAction = async (data) => {
  try {
    const response = await axiosCms.post(ENDPOINTS.ROBOT_ACTION, data)
    return response
  } catch (error) {
    console.error('Failed to create robot action:', error)
    throw error
  }
}

const updateRobotAction = async (data) => {
  try {
    const response = await axiosCms.put(ENDPOINTS.ROBOT_ACTION, data)
    return response
  } catch (error) {
    console.error('Failed to update robot action:', error)
    throw error
  }
}

const deleteRobotAction = async (data) => {
  try {
    const response = await axiosCms.delete(ENDPOINTS.ROBOT_ACTION, { data })
    return response
  } catch (error) {
    console.error('Failed to delete robot action:', error)
    throw error
  }
}

export { getRobotActions, getRobotActionCodes, createRobotAction, updateRobotAction, deleteRobotAction }
