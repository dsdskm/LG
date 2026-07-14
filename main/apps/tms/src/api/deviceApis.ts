import { robotClient } from '@repo/apis'
import { useQuery } from '@tanstack/react-query'

import { ENDPOINTS, GETSIZE } from './apiConstants'
import { DeviceListResponse, DeviceParams, DeviceResponse } from '@/types/api/device'

const baseurl = import.meta.env.VITE_API_DM_BASE_URL
const axiosRobot = robotClient(baseurl)
const pathDevices = ENDPOINTS.ROBOT.DEVICES

const getDeviceList = async (params?: DeviceParams): Promise<DeviceListResponse> => {
  console.log('getDeviceList', pathDevices)
  const size = GETSIZE // 기존에 정의된 size 값

  const response = await axiosRobot.get(pathDevices, {
    params: {
      size,
      ...(params ?? {})
    }
  })

  return response as DeviceListResponse
}

export function useDeviceList(params?: DeviceParams, enabled: boolean = true) {
  console.log('useDeviceList useDeviceList', params)
  return useQuery({
    queryKey: ['robots', params?.groupId, params?.siteId],
    queryFn: () => getDeviceList(params),
    enabled
  })
}

async function getDevice(deviceId?: string): Promise<DeviceResponse> {
  const response = await axiosRobot.get(pathDevices + '/' + deviceId)
  return response as DeviceResponse
}

export function useDevice(deviceId?: string) {
  return useQuery({
    queryKey: ['useDevice', deviceId],
    queryFn: () => getDevice(deviceId),
    enabled: deviceId !== undefined
  })
}

// async function deployTaskFlow(taskFlowId:string, robotIds: string[], options: Map<string, any>) {
//   return
// }
