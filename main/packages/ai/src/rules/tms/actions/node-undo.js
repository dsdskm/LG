import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-undo'

export const metadata = {
  ruleKey,
  description: '최근 편집을 취소',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/undo',
}

export async function executeNodeUndo(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.undo === 'function') {
    const result = await canvasActions.undo({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: '마지막 캔버스 작업을 실행 취소했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: '마지막 캔버스 작업을 실행 취소했습니다.',
  }
}

export default executeNodeUndo
