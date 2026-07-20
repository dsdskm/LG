import { Task } from '@/types/task'
import { client } from '@repo/apis'
import { ENDPOINTS } from './apiConstants'

const axiosClient = client(import.meta.env.VITE_API_BASE_URL)
const path = ENDPOINTS.TMS.TASKS

export async function listTasks(options: {
  groupId: string | null
  siteId: string | null
  include?: string | string[]
}): Promise<Task[]> {
  const params = new URLSearchParams()
  const inc = options?.include
  if (typeof inc === 'string' && inc.trim()) {
    params.set('include', inc.trim())
  } else if (Array.isArray(inc) && inc.length > 0) {
    params.set('include', inc.join(','))
  }
  params.set('groupId', String(options.groupId))
  params.set('siteId', String(options.siteId))
  const qs = params.toString()
  const url = `${path}${qs ? `?${qs}` : ''}`
  const res = await axiosClient.get(url)
  const rawItems = Array.isArray(res.content) ? res.content : []
  return rawItems as Task[]
}
