import { client } from '@repo/apis'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ENDPOINTS } from './apiConstants'
import type { DeployActionRequest, TaskFlow, TaskFlowWithDeployment } from '@/types/taskflow'

const axiosClient = client(import.meta.env.VITE_API_BASE_URL)
const path = ENDPOINTS.TMS.TASKFLOWS

// ------------------------------
// API functions
// ------------------------------

// include=lastDeployment 이므로 각 항목에 마지막 배포 정보(deployment)가 포함될 수 있다(없을 수도 있음)
export async function listTaskFlows(groupId: string | null, siteId: string | null): Promise<TaskFlowWithDeployment[]> {
  try {
    const searchParams = new URLSearchParams()

    searchParams.set('groupId', String(groupId))
    searchParams.set('siteId', String(siteId))
    searchParams.set('include', 'lastDeployment')

    const url = `${path}?${searchParams.toString()}`
    const res = await axiosClient.get(url)
    const rawItems = Array.isArray(res.content) ? res.content : []

    return rawItems as TaskFlowWithDeployment[]
  } catch (e) {
    console.log(e)
    return []
  }
}

export async function getTaskFlow(id: number, params?: Record<string, string>): Promise<TaskFlow | null> {
  const searchParams = new URLSearchParams(params)
  const query = searchParams.toString()
  const url = query ? `${path}/${id}?${query}` : `${path}/${id}`

  const response = await axiosClient.get(url)
  return response as TaskFlow
}

export async function createTaskFlow(data: TaskFlow): Promise<TaskFlow> {
  const { createdAt, updatedAt, ...payload } = data
  const response = await axiosClient.post(path, payload)
  return response as TaskFlow
}

export async function updateTaskFlow(id: number, patch: Partial<TaskFlow>): Promise<TaskFlow> {
  const response = await axiosClient.patch(path + '/' + id, patch)
  return response as TaskFlow
}

export async function deleteTaskFlow(id: number): Promise<void> {
  await axiosClient.delete(path + '/' + id)
}

// ------------------------------
// React Query hooks
// ------------------------------

export function useListTaskFlows(groupId: string | null, siteId: string | null) {
  return useQuery({
    queryKey: ['useListTaskFlows', groupId, siteId],
    queryFn: () => listTaskFlows(groupId, siteId),
    enabled: !!groupId && !!siteId
  })
}

export function useGetTaskFlow(id: number, params?: Record<string, string>) {
  return useQuery({
    queryKey: ['useGetTaskFlow', id, params],
    queryFn: () => getTaskFlow(id, params),
    enabled: id > -1
  })
}

export function useCreateTaskFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['useCreateTaskFlow'],
    mutationFn: (data: TaskFlow) => createTaskFlow(data),
    onSuccess: () => {
      // 목록 리프레시
      queryClient.invalidateQueries({ queryKey: ['useListTaskFlows'] })
    }
  })
}

export function useUpdateTaskFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['useUpdateTaskFlow'],
    mutationFn: ({ id, patch }: { id: number; patch: Partial<TaskFlow> }) => updateTaskFlow(id, patch),
    onSuccess: (_data, { id }) => {
      // 상세/목록 리프레시
      queryClient.invalidateQueries({ queryKey: ['useGetTaskFlow', id] })
      queryClient.invalidateQueries({ queryKey: ['useListTaskFlows'] })
    }
  })
}

export function useDeleteTaskFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['useDeleteTaskFlow'],
    mutationFn: (id: number) => deleteTaskFlow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['useListTaskFlows'] })
    }
  })
}

// 배포, 삭제(로봇에서도 모두 삭제후 삭제됨), 활성/비활성
// 배포 + 활성화 , 배포 + 비활성화

async function deployTaskFlowAction(params: DeployActionRequest) {
  const response = await axiosClient.post(path + '/' + params.taskFlowId + '/actions', params.param)
  return response
}

export function useDeployTaskFlowAction() {
  return useMutation({
    mutationFn: (params: DeployActionRequest) => deployTaskFlowAction(params)
  })
}
