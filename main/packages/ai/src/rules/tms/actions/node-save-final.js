import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-save-final'

export const metadata = {
  ruleKey,
  description: 'TaskFlow 운영 버전 저장',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/save'
}

export async function executeNodeSaveFinal(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: 'save-final' },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}
