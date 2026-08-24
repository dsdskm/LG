export type AiTaskflowCommandRoute = {
  robotId?: string | null
  taskFlowId?: number | null
}

function toParamArray(params: unknown): string[] {
  if (Array.isArray(params)) {
    return params.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  const single = String(params ?? '').trim()
  return single ? [single] : []
}

function isNumericText(value: string): boolean {
  return /^\d+$/.test(String(value ?? '').trim())
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN
}

export function resolveAiTaskflowCommandTarget(command: Record<string, unknown>, route: AiTaskflowCommandRoute = {}) {
  const robotCandidates = toParamArray(command?.robotId ?? command?.robot)
  const taskFlowCandidates = toParamArray(command?.taskFlowId ?? command?.taskflowId ?? command?.id)

  const routeRobotId = String(route.robotId ?? '').trim()
  const routeTaskFlowId = toPositiveNumber(route.taskFlowId)

  const explicitRobotId = robotCandidates.find((candidate) => !isNumericText(candidate)) || ''
  const explicitTaskFlowId = taskFlowCandidates.find((candidate) => isNumericText(candidate)) || ''

  let resolvedRobotId = explicitRobotId || routeRobotId || ''
  let taskFlowIdValue = Number(explicitTaskFlowId || (Number.isFinite(routeTaskFlowId) ? String(routeTaskFlowId) : ''))

  if (robotCandidates.length === 1 && taskFlowCandidates.length === 0) {
    const singleRobotCandidate = robotCandidates[0]
    if (isNumericText(singleRobotCandidate) && Number.isFinite(routeTaskFlowId)) {
      taskFlowIdValue = Number(singleRobotCandidate)
      resolvedRobotId = routeRobotId || resolvedRobotId
    } else {
      resolvedRobotId = singleRobotCandidate || routeRobotId || ''
      if (Number.isFinite(routeTaskFlowId)) {
        taskFlowIdValue = routeTaskFlowId
      }
    }
  }

  if (taskFlowCandidates.length === 1 && robotCandidates.length === 0) {
    const singleTaskFlowCandidate = taskFlowCandidates[0]
    if (isNumericText(singleTaskFlowCandidate) && routeRobotId) {
      resolvedRobotId = routeRobotId
      taskFlowIdValue = Number(singleTaskFlowCandidate)
    } else {
      taskFlowIdValue = Number(singleTaskFlowCandidate || (Number.isFinite(routeTaskFlowId) ? String(routeTaskFlowId) : ''))
      resolvedRobotId = routeRobotId || resolvedRobotId
    }
  }

  if (robotCandidates.length === 1 && taskFlowCandidates.length === 1) {
    if (!resolvedRobotId) {
      resolvedRobotId = robotCandidates[0]
    }
    if (!Number.isFinite(taskFlowIdValue)) {
      taskFlowIdValue = Number(taskFlowCandidates[0])
    }
  }

  return {
    resolvedRobotId,
    taskFlowIdValue
  }
}

function toReplyParamArray(robotId: string, taskFlowId: number) {
  return [String(robotId ?? '').trim(), String(taskFlowId ?? '').trim()]
}

export function buildAiTaskflowReplyText(template: unknown, robotId: string, taskFlowId: number) {
  const text = String(template ?? '').trim()
  if (!text) {
    return ''
  }

  const params = toReplyParamArray(robotId, taskFlowId)
  return text.replace(/\$(\d+)/g, (full, indexText) => {
    const index = Number(indexText) - 1
    if (!Number.isInteger(index) || index < 0) {
      return full
    }

    const value = params[index]
    return value ? value : full
  })
}
