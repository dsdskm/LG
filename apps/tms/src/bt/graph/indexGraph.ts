import type { Node, Edge } from '@xyflow/react'
import type { Dir } from '../types'
import { canUseLeftBranches, getNodeDisplayName, isControlNode } from '../bt.util'
import type { OutgoingEdgeRef, OutgoingInfo } from '../rules/types'

export function edgeHandleToDir(h: any): Dir | null {
  const s = String(h ?? '')
  if (s === 'right') return 'right'
  if (s === 'bottom') return 'bottom'
  if (s === 'left') return 'left'
  return null
}

function getEdgeDisplayName(edge: Edge): string {
  return String((edge as any).id ?? '(no-edge-id)')
}

function createOutgoingMap(nodes: Node[]): Map<string, OutgoingInfo> {
  const outgoing = new Map<string, OutgoingInfo>()
  for (const node of nodes) {
    outgoing.set(String(node.id), { leftBranches: [] })
  }
  return outgoing
}

function createNodeByIdMap(nodes: Node[]): Map<string, Node> {
  const nodeById = new Map<string, Node>()
  for (const node of nodes) {
    nodeById.set(String(node.id), node)
  }
  return nodeById
}

function pushMissingNodeWarning(
  warnings: string[],
  kind: 'source' | 'target',
  nodeId: string,
  edgeId: string,
  relatedNodeName: string
) {
  if (kind === 'source') {
    warnings.push(`엣지 source 노드가 존재하지 않음: ${nodeId} (edge id=${edgeId}, target=${relatedNodeName})`)
    return
  }

  warnings.push(`엣지 target 노드가 존재하지 않음: ${nodeId} (edge id=${edgeId}, source=${relatedNodeName})`)
}

function validateTargetHandle(edge: Edge, edgeId: string, sourceName: string, targetName: string) {
  const targetHandle = String((edge as any).targetHandle ?? '')
  if (targetHandle && targetHandle !== 'left') {
    throw new Error(
      `규칙 위반: 모든 엣지는 노드의 왼쪽(left)으로만 들어와야 합니다. ` +
        `(edge id=${edgeId}, source=${sourceName}, target=${targetName}, targetHandle="${targetHandle}")`
    )
  }
}

function resolveOutgoingDir(
  edge: Edge,
  warnings: string[],
  sourceName: string,
  targetName: string,
  edgeId: string
): Dir {
  const dir = edgeHandleToDir((edge as any).sourceHandle)
  if (dir) return dir

  warnings.push(`sourceHandle이 누락된 엣지를 right로 간주: ${sourceName} -> ${targetName} (edge id=${edgeId})`)
  return 'right'
}

function toOutgoingEdgeRef(edge: Edge): OutgoingEdgeRef {
  return {
    targetId: String(edge.target),
    edgeId: String((edge as any).id ?? ''),
    sourceHandle: ((edge as any).sourceHandle ?? null) as string | null,
    targetHandle: ((edge as any).targetHandle ?? null) as string | null,
    sourceNodeId: String(edge.source),
    targetNodeId: String(edge.target),
    edgeType: ((edge as any).data?.edgeType ?? null) as string | null
  }
}

function assignOutgoingTarget(params: {
  dir: Dir
  ent: OutgoingInfo
  sourceId: string
  edgeRef: OutgoingEdgeRef
  nodeById: Map<string, Node>
  sourceName: string
  targetName: string
}) {
  const { dir, ent, edgeRef, nodeById, sourceName, targetName } = params

  if (dir === 'right') {
    if (ent.right && ent.right.targetId !== edgeRef.targetId) {
      const existingTarget = nodeById.get(ent.right.targetId)
      throw new Error(
        `규칙 위반: 노드(${sourceName})에서 right 방향 outgoing은 1개만 가능합니다. ` +
          `기존=${getNodeDisplayName(existingTarget)}, 신규=${targetName}`
      )
    }
    ent.right = edgeRef
    return
  }

  if (dir === 'bottom') {
    if (ent.bottom && ent.bottom.targetId !== edgeRef.targetId) {
      const existingTarget = nodeById.get(ent.bottom.targetId)
      throw new Error(
        `규칙 위반: 노드(${sourceName})에서 bottom 방향 outgoing은 1개만 가능합니다. ` +
          `기존=${getNodeDisplayName(existingTarget)}, 신규=${targetName}`
      )
    }
    ent.bottom = edgeRef
  }
}

function handleLeftBranch(params: {
  dir: Dir
  ent: OutgoingInfo
  sourceNode: Node
  edgeRef: OutgoingEdgeRef
}): Dir {
  const { dir, ent, sourceNode, edgeRef } = params

  if (dir !== 'left') return dir

  if (canUseLeftBranches(sourceNode)) {
    ent.leftBranches = [...(ent.leftBranches ?? []), edgeRef]
    return dir
  }

  // 컨트롤이 아닌 노드의 좌측(left) 출력은 false(else) 분기다.
  // bottom 핸들을 제거하면서, 기존 bottom(보조/false) 슬롯을 그대로 재사용한다.
  return 'bottom'
}

function appendSharedChildWarnings(
  warnings: string[],
  incomingCount: Map<string, number>,
  nodeById: Map<string, Node>
) {
  const shared = [...incomingCount.entries()].filter(([_, count]) => count > 1)
  if (shared.length === 0) return

  warnings.push(
    `그래프에 여러 부모를 가진 노드가 있어 BT로 변환 시 서브트리가 복제될 수 있어요: ${shared
      .map(([id, count]) => `${getNodeDisplayName(nodeById.get(id))}(${count}회)`)
      .join(', ')}`
  )
}

export function indexGraph(params: { nodes: Node[]; edges: Edge[] }): {
  nodeById: Map<string, Node>
  outgoing: Map<string, OutgoingInfo>
  warnings: string[]
} {
  const { nodes, edges } = params

  const warnings: string[] = []
  const nodeById = createNodeByIdMap(nodes)
  const outgoing = createOutgoingMap(nodes)
  const incomingCount = new Map<string, number>()

  for (const edge of edges) {
    const sourceId = String(edge.source)
    const targetId = String(edge.target)

    const sourceNode = nodeById.get(sourceId)
    const targetNode = nodeById.get(targetId)

    const edgeId = getEdgeDisplayName(edge)
    const sourceName = getNodeDisplayName(sourceNode)
    const targetName = getNodeDisplayName(targetNode)

    if (!sourceNode) {
      pushMissingNodeWarning(warnings, 'source', sourceId, edgeId, targetName)
      continue
    }

    if (!targetNode) {
      pushMissingNodeWarning(warnings, 'target', targetId, edgeId, sourceName)
      continue
    }

    validateTargetHandle(edge, edgeId, sourceName, targetName)

    let dir = resolveOutgoingDir(edge, warnings, sourceName, targetName, edgeId)

    if (dir === 'bottom' && isControlNode(sourceNode)) {
      throw new Error(
        `규칙 위반: 컨트롤 노드는 bottom 방향으로 outgoing을 가질 수 없습니다. ` +
          `(source=${sourceName}, target=${targetName}, edge id=${edgeId})`
      )
    }

    const ent = outgoing.get(sourceId) ?? { leftBranches: [] }
    const edgeRef = toOutgoingEdgeRef(edge)

    dir = handleLeftBranch({
      dir,
      ent,
      sourceNode,
      edgeRef
    })

    assignOutgoingTarget({
      dir,
      ent,
      sourceId,
      edgeRef,
      nodeById,
      sourceName,
      targetName
    })

    outgoing.set(sourceId, ent)
    incomingCount.set(targetId, (incomingCount.get(targetId) ?? 0) + 1)
  }

  appendSharedChildWarnings(warnings, incomingCount, nodeById)

  return { nodeById, outgoing, warnings }
}
