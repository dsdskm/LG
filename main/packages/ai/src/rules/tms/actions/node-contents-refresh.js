import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-contents-refresh'

export const metadata = {
  ruleKey,
  description: '현재 노드의 컨텐츠들을 최신버전으로 업데이트',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/contents',
}

export async function executeNodeContentsRefresh(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.refreshContents === 'function') {
    const result = await canvasActions.refreshContents({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: '컨텐츠를 갱신했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: '컨텐츠를 갱신했습니다.',
  }
}

export default executeNodeContentsRefresh
