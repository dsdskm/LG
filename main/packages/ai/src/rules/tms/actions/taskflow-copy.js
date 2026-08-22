import { copyTaskFlow } from '../../../api/tms.api.js'

export async function executeTaskflowCopy(context = {}) {
  const { rule, params } = context
  let { replyText, fallbackText } = rule
  const [taskFlowId, taskFlowName] = params

  try {
    await copyTaskFlow({ taskFlowId, taskFlowName })
    if (params.length === 2) {
      replyText = replyText.replace('$1', params[0])
      replyText = replyText.replace('$2', params[1])
    } else {
      replyText = replyText.replace('$1', params[0])
      replyText = replyText.replace(/\s*\$2\s*이름으로/g, '').replace(/\$2/g, '')
    }
  } catch (e) {
    return fallbackText
  }
  return replyText
}
