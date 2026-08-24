import { deployTaskFlow } from '../../../api/tms.api.js'
import { resolveRobotTaskflowIds } from '../rule.utils.js'

export async function executeTaskflowDeploy(context = {}) {
  const { rule, params, groupId, siteId } = context
  let { replyText, fallbackText } = rule
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const { robotId, taskFlowId } = resolveRobotTaskflowIds(params, pathname)
  replyText = replyText.replace('$1', String(robotId ?? ''))
  replyText = replyText.replace('$2', String(taskFlowId ?? ''))

  try {
    const res = await deployTaskFlow({
      taskFlowId,
      robotId,
      groupId,
      siteId,
      description: 'deployed by ai assistant'
    })
  } catch (e) {
    return fallbackText
  }

  return replyText
}
