import type { ReactFlowObject, TaskFlow } from '@/types/taskflow'

/**
 * flowDefinition / flowDefinitionDraft 규칙
 *
 *  - flowDefinitionDraft : "저장 버전". 캔버스에서 저장할 때마다 항상 갱신된다.
 *  - flowDefinition      : "최종 버전". 저장 시 "최종 버전 저장"을 선택했을 때만 갱신된다.
 *                          (배포에 쓰이는 behaviorTree 와 짝을 이루는 정의)
 */
export type FlowDefinitionSource = 'final' | 'saved'

export const FLOW_SOURCE_QUERY_KEY = 'source'

/** nodes 가 없거나 비어 있으면 값이 없는 것으로 본다. ({} / null / {nodes: []} 모두 포함) */
export function isEmptyFlowDefinition(definition: unknown): boolean {
  if (!definition || typeof definition !== 'object') return true

  const nodes = (definition as ReactFlowObject).nodes
  return !Array.isArray(nodes) || nodes.length === 0
}

/** 저장 버전(flowDefinitionDraft) 이 있는지 */
export function hasSaved(flow?: Partial<TaskFlow> | null): boolean {
  return !isEmptyFlowDefinition(flow?.flowDefinitionDraft)
}

/** 최종 버전(flowDefinition) 이 있는지 */
export function hasFinal(flow?: Partial<TaskFlow> | null): boolean {
  return !isEmptyFlowDefinition(flow?.flowDefinition)
}

/** 지정한 쪽의 정의를 가져온다. (비어 있으면 {}) */
export function getFlowDefinitionBySource(
  flow: Partial<TaskFlow> | null | undefined,
  source: FlowDefinitionSource
): ReactFlowObject {
  const definition = source === 'final' ? flow?.flowDefinition : flow?.flowDefinitionDraft
  return isEmptyFlowDefinition(definition) ? {} : (definition as ReactFlowObject)
}

/** URL 쿼리 등에서 받은 문자열을 안전하게 source 로 변환한다. */
export function normalizeFlowSource(value: unknown): FlowDefinitionSource | null {
  const next = String(value ?? '')
    .trim()
    .toLowerCase()

  // checkpoint / draft 는 예전 링크 호환용 이름이다.
  if (next === 'final' || next === 'checkpoint') return 'final'
  if (next === 'saved' || next === 'draft') return 'saved'
  return null
}

/**
 * 편집(canvas)에서 불러올 쪽을 정한다.
 * 명시적으로 지정하지 않았다면 저장 버전을 쓰고, 없으면 최종 버전으로 넘어간다.
 */
export function resolveEditableSource(
  flow?: Partial<TaskFlow> | null,
  requested?: FlowDefinitionSource | null
): FlowDefinitionSource {
  if (requested === 'final') return hasFinal(flow) ? 'final' : 'saved'
  if (requested === 'saved') return hasSaved(flow) ? 'saved' : 'final'

  return hasSaved(flow) ? 'saved' : 'final'
}

/** canvas 진입 시 사용할 정의 */
export function pickEditableFlowDefinition(
  flow?: Partial<TaskFlow> | null,
  requested?: FlowDefinitionSource | null
): ReactFlowObject {
  if (!flow) return {}
  return getFlowDefinitionBySource(flow, resolveEditableSource(flow, requested))
}
