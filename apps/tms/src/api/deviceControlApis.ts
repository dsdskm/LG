import { robotClient } from '@repo/apis'
import { ENDPOINTS } from './apiConstants'
import { useMutation } from '@tanstack/react-query'
import { InstantActionsRequest } from '@/types/api/deviceControl'

const baseurl = import.meta.env.VITE_API_DM_BASE_URL
const axiosRobot = robotClient(baseurl)
const pathDevices = ENDPOINTS.ROBOT.DEVICES

async function instantAction(params: InstantActionsRequest) {
  console.log('deployTaskFlowAction parms', params)
  return await axiosRobot.post(pathDevices + '/' + params.deviceId + '/control', params.body)
}

export function useInstantAction() {
  return useMutation({
    mutationFn: (params: InstantActionsRequest) => instantAction(params)
  })
}
