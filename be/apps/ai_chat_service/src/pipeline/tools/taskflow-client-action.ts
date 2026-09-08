import type { ClientAction, ToolContext } from '../tool.type'
import { findClientFunctionName } from '../action-tool-registry'
import { TASKFLOW_CANVAS_SCREEN_KEY } from './taskflow-message'

/** 캔버스 draft 를 프론트에서 적용하게 하는 clientAction 을 만든다.
 * 함수 이름은 action_tool 표의 client_function 값(LLM 함수와 짝인 프론트 함수)이다.
 * 값이 없으면 프론트가 무엇을 실행해야 하는지 알 수 없으므로 clientAction 을 만들지 않는다.
 */
export function buildApplyDraftAction(
  draft: Record<string, unknown>,
  ctx: ToolContext,
  toolKey: string,
): { clientAction: ClientAction } | Record<string, never> {
  const name = findClientFunctionName(TASKFLOW_CANVAS_SCREEN_KEY, toolKey)
  if (!name) {
    ctx.log?.error(`[taskflow-client-action] action_tool.${toolKey}.client_function 설정이 없어 캔버스에 반영하지 못한다.`)
    return {}
  }

  return { clientAction: { name, args: { draft } } }
}
