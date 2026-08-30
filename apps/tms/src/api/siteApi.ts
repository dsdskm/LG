import { robotClient } from '@repo/apis'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENDPOINTS, GETSIZE } from './apiConstants'

const robotBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL
const axiosRobot = robotClient(robotBaseUrl)
const pathSites = ENDPOINTS.ROBOT.SITES

export type SiteQueryParams = Record<string, unknown> & {
  size?: number | string
}

export const getSites = async (params?: SiteQueryParams) => {
  const mergedParams = {
    ...(params ?? {}),
    size: GETSIZE
  }

  const path = pathSites
  const response = await axiosRobot.get(path, { params: mergedParams })
  return response
}

export const postSites = async (params: Record<string, unknown>) => {
  const path = pathSites
  const response = await axiosRobot.post(path, params)
  return response
}

export const getSiteById = async (siteId: string) => {
  const path = `${pathSites}/${siteId}`
  const response = await axiosRobot.get(path)
  return response
}

export function useSite(siteId: string) {
  return useQuery({
    queryKey: ['useSite', siteId],
    queryFn: () => getSiteById(siteId),
    enabled: siteId != null || siteId != undefined
  })
}

export const putSites = async (siteId: string, params: Record<string, unknown>) => {
  const path = `${pathSites}/${siteId}`
  const response = await axiosRobot.put(path, params)
  return response
}

export const deleteSites = async (siteId: string) => {
  const path = `${pathSites}/${siteId}`
  const response = await axiosRobot.delete(path)
  return response
}
