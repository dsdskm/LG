/** 채팅 서버가 내려주는 캔버스 draft 를 캔버스가 적용하는 형태로 정규화한다.
 * index.tsx 는 React 트리를 끌고 들어와 단독 테스트가 어려우므로 이 변환만 따로 둔다.
 */

export type AssistantDraftStep = {
  label?: string
  title?: string
  name?: string
  taskName?: string
  contentName?: string
  taskType?: string
  taskId?: number | string
  contentId?: number | string
  properties?: Record<string, unknown>
}

/** compose 도구가 내려주는 트리 노드. 자식은 부모의 분기(왼쪽 핸들)로 붙는다. */
export type AssistantDraftTreeNode = {
  taskName?: string
  taskType?: string
  contentName?: string
  contentId?: number
  /** Delay 의 delay_msec 처럼 서버가 지정한 속성. 기본값 위에 덮어쓴다. */
  properties?: Record<string, unknown>
  children?: AssistantDraftTreeNode[]
}

export type AssistantDraftInsert = {
  after?: string
  step?: string | AssistantDraftStep
  sourceHandle?: 'left' | 'right' | 'top' | 'bottom'
  targetHandle?: 'left' | 'right' | 'top' | 'bottom'
  reverseDirection?: boolean
  appendOnly?: boolean
  isolated?: boolean
  /** 같은 draft 안에서 n 번째 insert 가 만든 노드를 기준으로 붙인다. 이름이 겹쳐도 섞이지 않는다. */
  afterCreatedIndex?: number
  placement?: string
}

export type AssistantDraftPayload = {
  mode?: 'replace' | 'edit'
  roots?: AssistantDraftTreeNode[]
  insertAfter?: AssistantDraftInsert[]
}

/** 트리(roots)를 insertAfter 목록으로 펼친다.
 * 순차 실행은 depth 0 노드를 앞 노드 오른쪽에, 동시/분기 실행은 부모의 왼쪽 분기로 붙인다.
 */
export function flattenDraftRootsToInserts(roots: AssistantDraftTreeNode[]): AssistantDraftInsert[] {
  const inserts: AssistantDraftInsert[] = []

  const toStep = (node: AssistantDraftTreeNode): AssistantDraftStep => ({
    label: String(node.contentName ?? node.taskName ?? '').trim(),
    taskName: node.taskName,
    taskType: node.taskType,
    contentName: node.contentName,
    contentId: node.contentId,
    // 속성을 빠뜨리면 노드는 만들어지지만 delay_msec/num_cycles 가 기본값으로 남는다.
    ...(node.properties ? { properties: node.properties } : {})
  })

  const walkChildren = (node: AssistantDraftTreeNode, parentIndex: number) => {
    for (const child of Array.isArray(node.children) ? node.children : []) {
      if (!child || typeof child !== 'object') continue

      inserts.push({
        after: '',
        afterCreatedIndex: parentIndex,
        step: toStep(child),
        appendOnly: true,
        sourceHandle: 'left',
        targetHandle: 'left'
      })
      walkChildren(child, inserts.length - 1)
    }
  }

  let previousRootIndex: number | undefined
  for (const root of roots) {
    if (!root || typeof root !== 'object') continue

    inserts.push({
      after: '',
      ...(previousRootIndex !== undefined ? { afterCreatedIndex: previousRootIndex } : {}),
      step: toStep(root),
      appendOnly: true,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    const rootIndex = inserts.length - 1
    walkChildren(root, rootIndex)
    previousRootIndex = rootIndex
  }

  return inserts
}

/** roots 트리만 담긴 draft 는 edit 경로가 쓰는 insertAfter 형태로 바꿔 적용 로직을 하나로 유지한다. */
export function normalizeAssistantDraft<T extends AssistantDraftPayload>(draft: T | null): T | null {
  if (!draft) return null
  if (!Array.isArray(draft.roots) || draft.roots.length === 0) return draft
  if (Array.isArray(draft.insertAfter) && draft.insertAfter.length > 0) return draft

  const insertAfter = flattenDraftRootsToInserts(draft.roots)
  if (insertAfter.length === 0) return draft

  return { ...draft, mode: 'edit', insertAfter }
}

/** 이 insert 가 "자식으로 매달기"인지. 왼쪽 핸들에서 나가는 append 가 자식이다.
 * 자식은 기준 노드의 다음 노드를 가로채지 않고, 기준 노드 바로 아래에 놓인다.
 * 순서대로 잇기(오른쪽 핸들)는 기준 노드와 그 다음 노드 사이에 끼워진다.
 */
export function isChildAppendInsert(insert: AssistantDraftInsert | undefined): boolean {
  if (!insert?.appendOnly) return false
  return insert.sourceHandle === 'left' && insert.targetHandle === 'left'
}

/** 제어 노드의 자식으로 매달린 엣지인지. 왼쪽 핸들에서 나간 엣지가 자식 관계다.
 * 순차 흐름(오른쪽 핸들)과 구분해야 "A 우측에 추가" 가 A 의 자식 엣지를 가로채지 않는다.
 */
export function isBranchEdge(edge: { sourceHandle?: string | null } | undefined): boolean {
  return String(edge?.sourceHandle ?? '') === 'left'
}

export type DraftCreatedNode = { id: string; label: string; isControl: boolean }

/** 기준 노드를 안 적은 insert 의 대체 기준.
 * 같은 draft 에서 방금 만든 노드에 이어 붙인다. 자식 추가면 방금 만든 제어 노드가 부모다.
 * 이게 없으면 "제어 노드와 그 자식" 둘이 흐름의 꼬리로 잡혀 기준을 정하지 못한다.
 */
export function pickFallbackAnchor(
  created: DraftCreatedNode[],
  isChildAppend: boolean,
): DraftCreatedNode | null {
  if (created.length === 0) return null

  if (isChildAppend) {
    for (let index = created.length - 1; index >= 0; index -= 1) {
      if (created[index].isControl) return created[index]
    }
  }

  return created[created.length - 1]
}
