import type { Node, Edge, Viewport } from '@xyflow/react'

export const START_NODE_ID = 'start' as const

export type FlowDef = {
  nodes: Node[]
  edges: Edge[]
  viewport?: Viewport
}

export function isFlowDef(x: any): x is FlowDef {
  return x && Array.isArray(x.nodes) && Array.isArray(x.edges)
}

export function makeMinimalStartNode(): Node {
  return {
    id: START_NODE_ID,
    type: 'startNode',
    position: { x: 0, y: 0 },
    data: { label: 'START', locked: false },
    deletable: false,
    selectable: true,
    connectable: true
  } as any
}

export function ensureStartNode(def: any): FlowDef {
  if (!isFlowDef(def)) {
    return { nodes: [makeMinimalStartNode()], edges: [] }
  }

  const hasStart = def.nodes.some((n: any) => String(n?.id) === START_NODE_ID)
  if (hasStart) return def

  return {
    ...def,
    nodes: [makeMinimalStartNode(), ...def.nodes]
  }
}
