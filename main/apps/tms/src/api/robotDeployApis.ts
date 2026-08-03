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

  const { taskflowId, groupId, siteId } = params

  const searchParams = new URLSearchParams({
    taskflowId: String(taskflowId)
  })
  if (groupId) {
    searchParams.set('groupId', groupId)
  }
  if (siteId) {
    searchParams.set('siteId', siteId)
  }

  const response = await axiosClient.get(path + '/latest', {
    params: searchParams
  })

  return response
}

export function useGetLatestDeployments(params?: DeviceLatestDeploymentRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: ['latest_deployments', params?.groupId, params?.siteId, params?.taskflowId],
    queryFn: () => getLatestDeployments(params),
    enabled: enabled && !!params
  })
}
