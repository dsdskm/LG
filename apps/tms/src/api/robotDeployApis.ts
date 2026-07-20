import { client } from '@repo/apis'
import { useQuery } from '@tanstack/react-query'
import { ENDPOINTS } from './apiConstants'
import { DeviceLatestDeploymentRequest, DeviceLatestDeploymentResponse } from '@/types/api/deviceDeployment'

const axiosClient = client(import.meta.env.VITE_API_BASE_URL)
const path = ENDPOINTS.TMS.ROBOT_DEPLOY

async function getLatestDeployments(params?: DeviceLatestDeploymentRequest): Promise<DeviceLatestDeploymentResponse> {
  console.log('getLatestDeployments parms', params)

  if (!params) {
    throw new Error('params is required')
  }

  const { robotId, taskflowId, groupId, siteId } = params

  const searchParams = new URLSearchParams({
    groupId,
    siteId,
    taskflowId: String(taskflowId)
  })

  robotId.forEach((robotId) => {
    searchParams.append('robotId', robotId)
  })

  const response = await axiosClient.get(path + '/latest', {
    params: searchParams
  })

  return response
}

export function useGetLatestDeployments(params?: DeviceLatestDeploymentRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: ['robots', params?.groupId, params?.siteId, params?.taskflowId, [...(params?.robotId ?? [])].sort()],
    queryFn: () => getLatestDeployments(params),
    enabled: enabled && !!params
  })
}
