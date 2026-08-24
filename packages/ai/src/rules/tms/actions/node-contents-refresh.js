import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-contents-refresh'

export const metadata = {
  ruleKey,
  description: '현재 노드의 컨텐츠들을 최신버전으로 업데이트',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/contents'
}

export async function executeNodeContentsRefresh(context = {}) {
  const { rule } = context
  const { replyText } = rule

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
        detail: {
          command: { type: 'refresh-contents' },
          replyText: replyText
        }
      })
    )
  }

  return replyText
}

export default executeNodeContentsRefresh
