import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-redo'

export const metadata = {
  ruleKey,
  description: '취소한 편집을 다시 실행',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/redo'
}

export async function executeNodeRedo(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: 'redo' },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeRedo
