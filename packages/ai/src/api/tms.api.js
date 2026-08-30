import { API_CONFIG, client, robotClient } from '@repo/apis'
import { listChatRules } from '@repo/apis/ai/chatSettings.js'

const webClient = client(import.meta.env.VITE_API_BASE_URL)
const dmClient = robotClient(import.meta.env.VITE_API_DM_BASE_URL)

const taskflowPath = `${API_CONFIG.PREFIX_TMS}/taskflows`
const devicePath = `${API_CONFIG.PREFIX_ROBOT}/devices`

export async function getTaskFlow(taskFlowId) {
  const response = await webClient.get(`${taskflowPath}/${taskFlowId}`)
  return response
}

export async function createTaskFlow(payload) {
  const response = await webClient.post(taskflowPath, payload)
  return response
}

export async function copyTaskFlow({ taskFlowId, taskFlowName }) {
  const source = await getTaskFlow(taskFlowId)
  const {
    id: _originId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    deployment: _deployment,
    deployments: _deployments,
    lastDeployment: _lastDeployment,
    taskFlowSnapshotId: _taskFlowSnapshotId,
    ...rest
  } = source || {}

  const name = String(taskFlowName ?? '').trim() || `${String(source?.name ?? '').trim()} (복사본)`
  return createTaskFlow({ ...rest, id: 0, name, version: 0 })
}

export async function deleteTaskFlow(taskFlowId) {
  return webClient.delete(`${taskflowPath}/${taskFlowId}`)
}

export async function deployTaskFlow({ taskFlowId, robotId, groupId, siteId, description }) {
  const payload = {
    action: 'DEPLOY',
    groupId,
    siteId,
    robotInfos: [{ groupId: String(groupId ?? ''), siteId: String(siteId ?? ''), id: String(robotId ?? '') }],
    description: String(description ?? 'AI command deploy taskflow')
  }

  return webClient.post(`${taskflowPath}/${taskFlowId}/actions`, payload)
}

export async function sendTaskflowInstantAction({ userId, robotId, taskFlowId, actionType }) {
  const requestBody = {
    userId: String(userId ?? ''),
    actions: [
      {
        actionType,
        actionId: crypto.randomUUID(),
        blockingType: 'HARD',
        actionParameters: [{ key: 'tms_id', value: String(taskFlowId) }]
      }
    ]
  }

  return dmClient.post(`${devicePath}/${robotId}/instantActions`, requestBody)
}

export async function listTmsRuleList({ screenKey, forceRefresh = true } = {}) {
  const response = await listChatRules({
    appKey: 'tms',
    screenKey,
    forceRefresh
  })

  const items = Array.isArray(response?.data?.items)
    ? response.data.items
    : Array.isArray(response?.items)
      ? response.items
      : []

  return items
}
