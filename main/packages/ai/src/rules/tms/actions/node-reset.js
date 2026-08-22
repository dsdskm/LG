import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-reset'

export const metadata = {
  ruleKey,
  description: '저장된 최종 버전으로 노드 구성 리셋',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/reset',
}

export async function executeNodeReset(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.resetToFinal === 'function') {
    const result = await canvasActions.resetToFinal({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: '캔버스를 최종 버전으로 초기화 했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: '캔버스를 최종 버전으로 초기화 했습니다.',
  }
}

export default executeNodeReset
