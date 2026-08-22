import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-save-final'

export const metadata = {
  ruleKey,
  description: 'TaskFlow 최종 버전 저장',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/save',
}

export async function executeNodeSaveFinal(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.saveFinal === 'function') {
    const result = await canvasActions.saveFinal({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: 'TaskFlow를 최종 버전으로 저장했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: 'TaskFlow를 최종 버전으로 저장했습니다.',
  }
}

export default executeNodeSaveFinal
