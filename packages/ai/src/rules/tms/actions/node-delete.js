import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, RULE_KEY, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-delete'

export const metadata = {
  ruleKey,
  description: '노드 이름을 찾아 모두 삭제',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '!A'
}

export async function executeNodeDelete(context = {}) {
  const { rule, params = [] } = context
  const [target] = params
  const nodeName = String(target ?? '').trim()
  const replyText = String(rule.replyText ?? '').replace('$1', nodeName)
  const fallbackText = String(rule.fallbackText ?? '').replace('$1', nodeName)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: {
            type: RULE_KEY.NODE_DELETE,
            names: [nodeName],
            notFoundText: fallbackText
          },
          replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeDelete
