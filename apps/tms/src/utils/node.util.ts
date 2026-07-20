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
