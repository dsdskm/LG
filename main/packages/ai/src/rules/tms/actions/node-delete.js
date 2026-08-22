import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-delete'

export const metadata = {
  ruleKey,
  description: '노드 이름을 찾아 모두 삭제',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '!A',
}

export async function executeNodeDelete(context = {}) {
  const { canvasActions, taskFlowId, captures = [] } = context
  const [target] = captures

  if (typeof canvasActions?.deleteNode === 'function') {
    const result = await canvasActions.deleteNode({ taskFlowId, nodeName: target })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: `${target ?? 'A'} 노드를 삭제했습니다.`,
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: `${target ?? 'A'} 노드를 삭제했습니다.`,
  }
}

export default executeNodeDelete
