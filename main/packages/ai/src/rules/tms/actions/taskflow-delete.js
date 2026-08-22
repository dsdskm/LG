import { deleteTaskFlow } from '../../../api/tms.api.js'

export async function executeTaskflowDelete(context = {}) {
  const { rule, params } = context
  let { replyText, fallbackText } = rule
  const [taskFlowId] = params

  try {
    replyText = replyText.replace('$1', taskFlowId)
    await deleteTaskFlow(taskFlowId)
  } catch (e) {
    return fallbackText
  }

  return replyText
}
