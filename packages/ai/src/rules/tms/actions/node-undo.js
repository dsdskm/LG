import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, RULE_KEY, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-undo'

export const metadata = {
  ruleKey,
  description: '최근 편집을 취소',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/undo'
}

export async function executeNodeUndo(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: RULE_KEY.NODE_UNDO },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeUndo
