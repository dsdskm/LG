import type { Node } from '@xyflow/react'

import { ensureStartNode, START_NODE_ID } from './flow'
import type { BuildResult, BtAstNode } from './types'
import { sequenceNodeType, BtSequenceNode } from './nodes/btSequenceNode'

import { indexGraph } from './graph/indexGraph'
import { renderBehaviorTreeXml } from './render/renderBtCppXlm'
import { btRules } from './rules'
import type { OutgoingEdgeRef, OutgoingInfo } from './rules/types'
import { createBtActionNode } from './mapping/createBtActionNode'
import { getNodeDisplayName } from './bt.util'

type PreparedBuildInput = {
  nodeById: Map<string, Node>
  outgoing: Map<string, OutgoingInfo>
  warnings: string[]
  startChildren: OutgoingEdgeRef[]
}

type RuleContext = {
  node: Node
  nodeId: string
  outgoing: OutgoingInfo
  outgoingById: Map<string, OutgoingInfo>
  nodeById: Map<string, Node>
  buildAstList: (nodeId: string) => BtAstNode[]
}

export function buildBehaviorTreeFromFlowDefinition(flowDefinition: any): BuildResult {
  const prepared = prepareBuildInput(flowDefinition)

  const model = buildBtModel(prepared.startChildren, prepared.nodeById, prepared.outgoing)

  const xml = renderBehaviorTreeXml(model)

  return {
    model,
    xml,
    warnings: prepared.warnings
  }
}

function prepareBuildInput(flowDefinition: any): PreparedBuildInput {
  const normalizedDefinition = normalizeFlowDefinition(flowDefinition)

  validateNoIsolatedNodes(normalizedDefinition)

  const indexedGraph = buildGraphIndex(normalizedDefinition)

  validateStartNodeExists(indexedGraph.nodeById)

  const startChildren = collectStartChildrenOrThrow(indexedGraph.outgoing, indexedGraph.warnings)

  console.log('indexedGraph.nodeById', indexedGraph.nodeById)

  return {
    nodeById: indexedGraph.nodeById,
    outgoing: indexedGraph.outgoing,
    warnings: indexedGraph.warnings,
    startChildren
  }
}

function normalizeFlowDefinition(flowDefinition: any) {
  return ensureStartNode(flowDefinition)
}

function buildGraphIndex(definition: { nodes: any[]; edges: any[] }): {
  nodeById: Map<string, Node>
  outgoing: Map<string, OutgoingInfo>
  warnings: string[]
} {
  const { nodeById, outgoing, warnings } = indexGraph({
    nodes: definition.nodes,
    edges: definition.edges
  })

  return {
    nodeById,
    outgoing,
    warnings
  }
}

function validateStartNodeExists(nodeById: Map<string, Node>) {
  if (!nodeById.has(START_NODE_ID)) {
    throw new Error(`START 노드(id="${START_NODE_ID}")를 찾지 못했어요.`)
  }
}

function collectStartChildrenOrThrow(outgoing: Map<string, OutgoingInfo>, warnings: string[]): OutgoingEdgeRef[] {
  const startOut = outgoing.get(START_NODE_ID) ?? { leftBranches: [] as OutgoingEdgeRef[] }
  const startChildren: OutgoingEdgeRef[] = []

  if (startOut.right) {
    startChildren.push(startOut.right)
  }

  if (startOut.bottom) {
    startChildren.push(startOut.bottom)
    warnings.push(`START 노드에서 bottom(false) outgoing이 존재해요. root_sequence에 추가로 이어붙였습니다.`)
  }

  if ((startOut.leftBranches?.length ?? 0) > 0) {
    warnings.push(`START 노드의 leftBranches는 무시합니다(OR 전용).`)
  }

  if (startChildren.length === 0) {
    throw new Error('START 노드에서 나가는 엣지가 없어 BT 트리로 변환할 수 없습니다.')
  }

  return startChildren
}

function buildBtModel(
  startChildren: OutgoingEdgeRef[],
  nodeById: Map<string, Node>,
  outgoing: Map<string, OutgoingInfo>
): BtSequenceNode {
  const buildAstList = createAstBuilder(nodeById, outgoing)

  return {
    kind: sequenceNodeType,
    name: 'root_sequence',
    children: startChildren.flatMap((ref) => buildAstList(ref.targetId))
  }
}

function createAstBuilder(
  nodeById: Map<string, Node>,
  outgoing: Map<string, OutgoingInfo>
): (nodeId: string) => BtAstNode[] {
  const visiting = new Set<string>()

  function buildAstList(nodeId: string): BtAstNode[] {
    const node = getNodeOrThrow(nodeById, nodeId)

    assertNoCycle(visiting, nodeId)
    visiting.add(nodeId)

    try {
      const ctx = createRuleContext(node, nodeId, nodeById, outgoing, buildAstList)
      return applyRulesOrCreateLeaf(ctx)
    } finally {
      visiting.delete(nodeId)
    }
  }

  return buildAstList
}

function getNodeOrThrow(nodeById: Map<string, Node>, nodeId: string): Node {
  const node = nodeById.get(nodeId)
  if (!node) {
    throw new Error(`노드를 찾을 수 없음: ${nodeId}`)
  }
  return node
}

function assertNoCycle(visiting: Set<string>, nodeId: string) {
  if (visiting.has(nodeId)) {
    throw new Error(`사이클 감지: ${nodeId} (BT.CPP XML 출력은 루프를 직접 지원하지 않음)`)
  }
}

function createRuleContext(
  node: Node,
  nodeId: string,
  nodeById: Map<string, Node>,
  outgoing: Map<string, OutgoingInfo>,
  buildAstList: (nodeId: string) => BtAstNode[]
): RuleContext {
  return {
    node,
    nodeId,
    outgoing: outgoing.get(nodeId) ?? { leftBranches: [] },
    outgoingById: outgoing,
    nodeById,
    buildAstList
  }
}

function applyRulesOrCreateLeaf(ctx: RuleContext): BtAstNode[] {
  for (const rule of btRules) {
    if (rule.match(ctx)) {
      return rule.apply(ctx)
    }
  }

  // 어떤 규칙도 매칭되지 않아 leaf(액션)로 처리한다. 이때 아직 처리 못 한 다음 연결
  // (right/bottom/leftBranch)이 남아 있으면 그 하위 노드들이 조용히 버려지므로(도달 불가),
  // 명확한 에러로 알린다.
  //  - 액션 노드는 오른쪽(다음) 1개만 연결 가능 (only-right 는 ifThen 규칙이 처리)
  //  - else(왼쪽→bottom) 분기는 IfThenElse 의 조건일 때만 허용된다.
  const out = ctx.outgoing
  const hasDanglingOutgoing = !!out.right || !!out.bottom || (out.leftBranches?.length ?? 0) > 0
  if (hasDanglingOutgoing) {
    throw new Error(
      `"${getNodeDisplayName(ctx.node)}" 노드의 다음 연결을 해석할 수 없습니다. ` +
        `액션 노드는 오른쪽(다음) 1개만 연결할 수 있고, else(왼쪽) 분기는 IfThenElse 조건일 때만 사용할 수 있습니다.`
    )
  }

  return [createBtActionNode(ctx.node)]
}

function validateNoIsolatedNodes(def: {
  nodes: Array<{ id: string; data?: any }>
  edges: Array<{ source: string; target: string }>
}) {
  const incidentCount = new Map<string, number>()

  for (const node of def.nodes) {
    incidentCount.set(node.id, 0)
  }

  for (const edge of def.edges ?? []) {
    incidentCount.set(edge.source, (incidentCount.get(edge.source) ?? 0) + 1)
    incidentCount.set(edge.target, (incidentCount.get(edge.target) ?? 0) + 1)
  }

  const isolatedNodes = def.nodes.filter((node) => (incidentCount.get(node.id) ?? 0) === 0)

  if (isolatedNodes.length === 0) return

  const isolatedNodeNames = isolatedNodes.map((node) => {
    const label = node.data?.taskName ?? node.data?.label ?? node.data?.name ?? node.id

    return `"${String(label)}"`
  })

  throw new Error(
    `엣지가 하나도 연결되지 않은 노드가 있어 BT 트리로 변환할 수 없습니다: ${isolatedNodeNames.join(', ')}`
  )
}
