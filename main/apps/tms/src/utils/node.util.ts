import type { Node, Edge, XYPosition } from '@xyflow/react'
import { Position } from '@xyflow/react'

export const START_NODE_ID = 'start'

/**
 * 캔버스 표시 방향 모드
 * - default: 좌→우 흐름 (기본)
 * - tree: 위→아래 흐름 (트리처럼)
 *
 * ※ 핸들 ID('right'/'bottom'/'left')는 BT 의미(주흐름/보조분기/입력)를 담는 불변값이고,
 *   모드는 그 핸들의 "시각적 위치(Position)"만 바꾼다. 따라서 엣지 데이터와 BT 생성은 동일하다.
 */
export type FlowMode = 'default' | 'tree'

export type HandlePositions = {
  right: Position
  bottom: Position
  left: Position
}

export function getHandlePositions(mode: FlowMode): HandlePositions {
  if (mode === 'tree') {
    // 세로 모드: 가로 모드를 90° 회전. 왼쪽→위, 오른쪽→아래로 대응한다.
    return {
      right: Position.Bottom, // 오른쪽 → 아래 (주 흐름 출력)
      bottom: Position.Left, // (미사용) 회전 대응값
      left: Position.Top // 왼쪽 → 위 (입력 + OR 출력)
    }
  }

  return {
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left
  }
}

type TaskLike = {
  id?: number
  name?: string
  taskType?: string
}

type StartNodeData = {
  label: string
  locked: boolean
  taskId: number
  taskName: string
  taskType: string
  properties: Record<string, unknown>
}

function makeStartNodeData(taskPayload?: TaskLike): StartNodeData {
  const name = taskPayload?.name ?? 'START'

  return {
    label: name,
    locked: false,
    taskId: taskPayload?.id ?? -1,
    taskName: name,
    taskType: taskPayload?.taskType ?? 'ROOT',
    properties: {}
  }
}

/**
 * taskPayload가 있으면 그 정보로 startNode 생성
 */
export function makeStartNode(taskPayload?: TaskLike, position: XYPosition = { x: 0, y: 0 }): Node<StartNodeData> {
  return {
    id: START_NODE_ID,
    type: 'startNode',
    position,
    data: makeStartNodeData(taskPayload),
    draggable: true,
    selectable: true,
    deletable: false,
    connectable: true
  }
}

/**
 * 기존 startNode + 최신 taskPayload 병합
 * - 기존 position 유지
 * - 기존 사용자 조작값 최대한 보존
 * - draggable 강제
 */
function normalizeStartNode(node?: Node, taskPayload?: TaskLike): Node<StartNodeData> {
  const base = makeStartNode(taskPayload)

  return {
    ...node,
    ...base,

    id: START_NODE_ID,
    type: 'startNode',

    // ✅ 사용자 이동 위치 유지
    position: node?.position ?? base.position,

    // ✅ data는 task 최신값 반영 + 기존 properties 유지
    data: {
      ...makeStartNodeData(taskPayload),
      ...(node?.data ?? {}),
      label: taskPayload?.name ?? 'START',
      locked: false,
      taskId: taskPayload?.id ?? -1,
      taskName: taskPayload?.name ?? 'START',
      taskType: taskPayload?.taskType ?? 'ROOT',
      properties: (node?.data as any)?.properties ?? {}
    },

    draggable: true,
    selectable: true,
    deletable: false,
    connectable: true
  }
}

/**
 * flowDefinition에 start node가 없으면 보정해서 넣어줌
 * taskList에서 ROOT 타입이 있으면 그걸로 startNode 생성
 */
export function ensureStartNode(def: any, taskList?: any[]): any {
  const rootTask = Array.isArray(taskList) ? taskList.find((t) => t?.taskType === 'ROOT') : undefined
  if (!def || !Array.isArray(def.nodes) || !Array.isArray(def.edges)) {
    return {
      nodes: [makeStartNode(rootTask)],
      edges: []
    }
  }

  const allNodes = def.nodes as Node[]
  const existingStartNode = allNodes.find((n) => n?.id === START_NODE_ID)
  const startNode = normalizeStartNode(existingStartNode, rootTask)
  const otherNodes = allNodes.filter((n) => n?.id !== START_NODE_ID)

  return {
    ...def,
    nodes: [startNode, ...otherNodes]
  }
}

export function isStartNodeId(id: string | null | undefined) {
  return id === START_NODE_ID
}

export function filterOutStartNodes(nodes: Node[]) {
  return nodes.filter((n) => n.id !== START_NODE_ID)
}

export function filterOutEdgesConnectedToNode(edges: Edge[], nodeId: string) {
  return edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
}

/** =========================
 *  같은 이름 노드 번호(ordinal)
 *  화면에는 안 뜨고 AI 지목 · draft 적용에만 쓴다. Start 에서 실행되는 순서를 기준으로 삼는다.
 *  ========================= */

export const NODE_ORDINAL_PREFIX = '#'

type OrdinalNodeLike = {
  id?: string
  data?: Record<string, unknown>
}

export function resolveNodeDisplayName(node: OrdinalNodeLike): string {
  const data = (node?.data ?? {}) as Record<string, unknown>
  return String(data.label ?? data.contentName ?? data.taskName ?? '').trim()
}

function toOrdinalGroupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 노드 id 는 발급 시각(ms)이 증가하는 값이라 Start 에서 도달 못하는 노드의 순서를 가르는 폴백으로만 쓴다.
 */
function toCreationSeq(id: string): number {
  const matched = id.match(/\d+/)
  return matched ? Number(matched[0]) : 0
}

type OrdinalEdgeLike = {
  source?: string
  target?: string
  sourceHandle?: string | null
}

/**
 * Start 에서 그래프를 따라가며 방문한 순서. "몇 번째"는 생성 시각이 아니라 이 실행 순서를 기준으로 삼는다.
 * 중간에 노드를 끼워 넣어도 그 위치가 바뀌지, 모든 새 노드가 제일 마지막 번호가 되는 건 아니다.
 */
function buildStartTraversalOrder(nodes: OrdinalNodeLike[], edges: OrdinalEdgeLike[]): Map<string, number> {
  const ids = new Set(nodes.map((node) => String(node?.id ?? '')).filter(Boolean))
  const outgoingByNode = new Map<string, Array<{ target: string; branch: boolean }>>()

  for (const edge of edges) {
    const source = String(edge?.source ?? '')
    const target = String(edge?.target ?? '')
    if (!source || !target || !ids.has(target)) continue

    const entry = { target, branch: String(edge?.sourceHandle ?? '') === 'left' }
    const bucket = outgoingByNode.get(source)
    if (bucket) bucket.push(entry)
    else outgoingByNode.set(source, [entry])
  }

  const order = new Map<string, number>()
  const queue: string[] = [START_NODE_ID]
  const visited = new Set<string>([START_NODE_ID])
  let seq = 0

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue

    const outgoing = outgoingByNode.get(currentId) ?? []
    // 다음(순차) 먼저, 자식(분기)은 그 다음에 방문해 읽는 순서와 맞춘다.
    const ordered = [...outgoing.filter((edge) => !edge.branch), ...outgoing.filter((edge) => edge.branch)]

    for (const edge of ordered) {
      if (visited.has(edge.target)) continue
      visited.add(edge.target)
      order.set(edge.target, seq)
      seq += 1
      queue.push(edge.target)
    }
  }

  return order
}

/**
 * 이름이 겹치는 노드에만 Start 기준 실행 순서대로 1부터 번호를 준다.
 * 유일한 이름은 번호를 갖지 않는다.
 */
export function buildNodeOrdinalMap(nodes: OrdinalNodeLike[], edges: OrdinalEdgeLike[] = []): Map<string, number> {
  const traversalOrder = buildStartTraversalOrder(nodes, edges)
  const grouped = new Map<string, OrdinalNodeLike[]>()

  for (const node of nodes) {
    const id = String(node?.id ?? '')
    if (!id || id === START_NODE_ID) continue

    const key = toOrdinalGroupKey(resolveNodeDisplayName(node))
    if (!key) continue

    const bucket = grouped.get(key)
    if (bucket) bucket.push(node)
    else grouped.set(key, [node])
  }

  const ordinals = new Map<string, number>()

  for (const bucket of grouped.values()) {
    if (bucket.length < 2) continue

    bucket
      .slice()
      .sort((a, b) => {
        const aId = String(a?.id ?? '')
        const bId = String(b?.id ?? '')
        const aOrder = traversalOrder.get(aId)
        const bOrder = traversalOrder.get(bId)

        // Start 에서 도달 못하는 노드는 뒤로 보내고 생성 순서로만 구분한다.
        if (aOrder === undefined && bOrder === undefined) {
          return toCreationSeq(aId) - toCreationSeq(bId) || aId.localeCompare(bId)
        }
        if (aOrder === undefined) return 1
        if (bOrder === undefined) return -1
        return aOrder - bOrder
      })
      .forEach((node, index) => ordinals.set(String(node.id), index + 1))
  }

  return ordinals
}

/** "Parallel #2" 처럼 번호가 붙은 지목을 이름과 번호로 가른다. */
export function parseNodeTargetName(value: unknown): { name: string; ordinal: number | null } {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(.*\S)\s*#\s*(\d+)$/)
  if (!matched) return { name: raw, ordinal: null }

  const ordinal = Number(matched[2])
  if (!Number.isInteger(ordinal) || ordinal <= 0) return { name: raw, ordinal: null }

  return { name: matched[1].trim(), ordinal }
}

export function formatNodeTargetName(name: unknown, ordinal?: number | null): string {
  const base = String(name ?? '').trim()
  if (!base || !ordinal || ordinal <= 0) return base

  return `${base} ${NODE_ORDINAL_PREFIX}${ordinal}`
}
