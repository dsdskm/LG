import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, RULE_KEY, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-reset'

export const metadata = {
  ruleKey,
  description: '저장된 운영 버전으로 노드 구성 리셋',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/reset'
}

export async function executeNodeReset(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: RULE_KEY.NODE_RESET },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeReset
