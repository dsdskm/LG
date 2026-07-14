import { robotClient } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathFloors = ENDPOINTS.ROBOT.FLOORS

export const getFloors = async (params) => {
  const response = await axiosRobot.get(pathFloors, { params })
  return response
}

export const getFloorById = async (floorId) => {
  const response = await axiosRobot.get(`${pathFloors}/${floorId}`)
  return response
}

export const postFloors = async (params) => {
  const response = await axiosRobot.post(pathFloors, params)
  return response
}

export const putFloors = async (floorId, params) => {
  const response = await axiosRobot.put(`${pathFloors}/${floorId}`, params)
  return response
}

export const deleteFloors = async (floorId) => {
  const response = await axiosRobot.delete(`${pathFloors}/${floorId}`)
  return response
}
