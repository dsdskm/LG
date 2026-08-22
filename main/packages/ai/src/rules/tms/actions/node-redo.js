import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-redo'

export const metadata = {
  ruleKey,
  description: '취소한 편집을 다시 실행',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/redo',
}

export async function executeNodeRedo(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.redo === 'function') {
    const result = await canvasActions.redo({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: '마지막으로 취소한 캔버스 작업을 다시 실행했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: '마지막으로 취소한 캔버스 작업을 다시 실행했습니다.',
  }
}

export default executeNodeRedo
