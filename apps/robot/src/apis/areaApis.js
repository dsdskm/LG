import { robotClient } from '@repo/apis'
import { ENDPOINTS } from './constants'

const axiosRobot = robotClient(import.meta.env.VITE_API_BASE_URL)
const pathAreas = ENDPOINTS.ROBOT.AREAS

export const getAreas = async (params) => {
  const response = await axiosRobot.get(pathAreas, { params })
  return response
}

export const getAreaById = async (areaId) => {
  const response = await axiosRobot.get(`${pathAreas}/${areaId}`)
  return response
}

export const postAreas = async (params) => {
  const response = await axiosRobot.post(pathAreas, params)
  return response
}

export const putAreas = async (areaId, params) => {
  const response = await axiosRobot.put(`${pathAreas}/${areaId}`, params)
  return response
}

export const deleteAreas = async (areaId) => {
  const response = await axiosRobot.delete(`${pathAreas}/${areaId}`)
  return response
}
