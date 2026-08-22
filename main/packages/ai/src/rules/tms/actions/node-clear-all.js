import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-clear-all'

export const metadata = {
  ruleKey,
  description: 'Start 노드를 제외한 모든 노드를 정리',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/clear',
}

export async function executeNodeClearAll(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.clearAll === 'function') {
    const result = await canvasActions.clearAll({ taskFlowId, keepStartNode: true })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: '전체 노드를 초기화했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: '전체 노드를 초기화했습니다.',
  }
}

export default executeNodeClearAll
