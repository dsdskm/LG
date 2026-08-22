import { TASKFLOW_CANVAS_RULE_ROUTE_KEY } from '@repo/constants'

export const ruleKey = 'node-save-temp'

export const metadata = {
  ruleKey,
  description: 'TaskFlow 임시 버전을 저장',
  screenKey: TASKFLOW_CANVAS_RULE_ROUTE_KEY,
  command: '/temp',
}

export async function executeNodeSaveTemp(context = {}) {
  const { canvasActions, taskFlowId } = context

  if (typeof canvasActions?.saveTemp === 'function') {
    const result = await canvasActions.saveTemp({ taskFlowId })
    return {
      ok: true,
      ruleKey,
      taskFlowId,
      message: 'TaskFlow를 임시 버전으로 저장했습니다.',
      result,
    }
  }

  return {
    ok: true,
    ruleKey,
    taskFlowId,
    message: 'TaskFlow를 임시 버전으로 저장했습니다.',
  }
}

export default executeNodeSaveTemp
