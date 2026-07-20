import type { Node } from '@xyflow/react'
import type { BtAstNode } from '../types'

export type OutgoingEdgeRef = {
  targetId: string
  edgeId: string
  sourceHandle?: string | null
  targetHandle?: string | null
  sourceNodeId?: string | null
  targetNodeId?: string | null
  edgeType?: string | null
}

export type OutgoingInfo = {
  right?: OutgoingEdgeRef
  bottom?: OutgoingEdgeRef
  leftBranches?: OutgoingEdgeRef[]
}

export type BtRuleContext = {
  node: Node
  nodeId: string
  outgoing: OutgoingInfo
  outgoingById: Map<string, OutgoingInfo>
  nodeById: Map<string, Node>
  buildAstList: (nodeId: string) => BtAstNode[]
}

export type BtRule = {
  name: string
  match: (ctx: BtRuleContext) => boolean
  apply: (ctx: BtRuleContext) => BtAstNode[]
}
;``
