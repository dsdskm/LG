import { robotClient } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathBuildings = ENDPOINTS.ROBOT.BUILDINGS

export const getBuildings = async (params) => {
  const response = await axiosRobot.get(pathBuildings, { params })
  return response
}

export const getBuildingById = async (buildingId) => {
  const response = await axiosRobot.get(`${pathBuildings}/${buildingId}`)
  return response
}

export const postBuildings = async (params) => {
  const response = await axiosRobot.post(pathBuildings, params)
  return response
}

export const putBuildings = async (buildingId, params) => {
  const response = await axiosRobot.put(`${pathBuildings}/${buildingId}`, params)
  return response
}

export const deleteBuildings = async (buildingId) => {
  const response = await axiosRobot.delete(`${pathBuildings}/${buildingId}`)
  return response
}
