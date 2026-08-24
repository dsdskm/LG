import { sendTaskflowInstantAction } from '../../../api/tms.api.js'
import { resolveRobotTaskflowIds } from '../rule.utils.js'

function replaceReplyText(replyText, robotId, taskFlowId) {
  return String(replyText ?? '')
    .replace('$1', String(robotId ?? ''))
    .replace('$2', String(taskFlowId ?? ''))
}

export async function executeTaskflowInstantAction(context = {}, actionType) {
  const { rule = {}, userId, params, replyText: initialReplyText = '' } = context
  const { fallbackText } = rule
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const { robotId, taskFlowId } = resolveRobotTaskflowIds(params, pathname)

  try {
    await sendTaskflowInstantAction({ userId, robotId, taskFlowId, actionType })
    return replaceReplyText(initialReplyText, robotId, taskFlowId)
  } catch {
    return fallbackText
  }
}
