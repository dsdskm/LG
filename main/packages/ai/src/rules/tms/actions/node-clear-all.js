import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, RULE_KEY, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-clear-all'

export const metadata = {
  ruleKey,
  description: 'Start 노드를 제외한 모든 노드를 정리',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/clear'
}

export async function executeNodeClearAll(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: RULE_KEY.NODE_CLEAR_ALL },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeClearAll
