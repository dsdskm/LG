import type { Node } from '@xyflow/react'
import type { BtAstNode, BtSequenceNode } from './types'
import type { OutgoingEdgeRef, OutgoingInfo } from './rules/types'
import { sanitizeXmlAttrValue } from './render/xml'

export function getNodeTaskType(node: Node): string {
  const data: any = (node as any).data ?? {}
  return String(data.taskType ?? '').toUpperCase()
}

export function getNodeTaskName(node: Node): string {
  const data: any = (node as any).data ?? {}
  return String(data.taskName ?? data.label ?? data.name ?? '')
    .trim()
    .toLowerCase()
}

export function getNodeDisplayName(node: Node | undefined | null): string {
  if (!node) return '(unknown)'

  const data: any = (node as any).data ?? {}
  const name = data.taskName ?? data.label ?? data.name ?? data.title ?? node.id

  return `${String(name)} [id=${String(node.id)}]`
}

export function getRuleNodeName(node: Node, prefix: string): string {
  const data: any = (node as any).data ?? {}
  const rawName = String(data.taskName ?? data.label ?? data.name ?? node.id)
  return `${prefix}_${sanitizeXmlAttrValue(rawName)}`
}

export function isControlNode(node: Node): boolean {
  return getNodeTaskType(node) === 'CONTROL'
}

export function isOrControlNode(node: Node): boolean {
  return isControlNode(node) && getNodeTaskName(node) === 'or'
}

export function isParallelControlNode(node: Node): boolean {
  return isControlNode(node) && getNodeTaskName(node) === 'parallel'
}

export function isRepeatControlNode(node: Node): boolean {
  return isControlNode(node) && getNodeTaskName(node) === 'repeat'
}

export function isIfThenElseControlNode(node: Node): boolean {
  if (!isControlNode(node)) return false

  const name = getNodeTaskName(node)
  return name === 'if then else' || name === 'ifthenelse' || name === 'if_then_else'
}

export function canUseLeftBranches(node: Node): boolean {
  return (
    isOrControlNode(node) || isParallelControlNode(node) || isRepeatControlNode(node) || isIfThenElseControlNode(node)
  )
}

export function hasLeftBranches(outgoing?: OutgoingInfo): boolean {
  return (outgoing?.leftBranches?.length ?? 0) > 0
}

export function hasRightOutgoing(outgoing?: OutgoingInfo): boolean {
  return !!outgoing?.right
}

export function hasBottomOutgoing(outgoing?: OutgoingInfo): boolean {
  return !!outgoing?.bottom
}

export function hasOnlyRightOutgoing(outgoing?: OutgoingInfo): boolean {
  return hasRightOutgoing(outgoing) && !hasBottomOutgoing(outgoing) && !hasLeftBranches(outgoing)
}

export function isIfElseRuleMatch(node: Node, outgoing?: OutgoingInfo): boolean {
  return isOrControlNode(node) && hasLeftBranches(outgoing)
}

export function isParallelRuleMatch(node: Node, outgoing?: OutgoingInfo): boolean {
  return isParallelControlNode(node) && hasLeftBranches(outgoing)
}

export function isRepeatRuleMatch(node: Node, outgoing?: OutgoingInfo): boolean {
  return isRepeatControlNode(node) && hasLeftBranches(outgoing)
}

export function isIfThenElseRuleMatch(node: Node, outgoing?: OutgoingInfo): boolean {
  return isIfThenElseControlNode(node) && hasLeftBranches(outgoing)
}

export function isIfThenRuleMatch(outgoing?: OutgoingInfo): boolean {
  return hasOnlyRightOutgoing(outgoing)
}

export function sortNodeIdsByCanvasPosition(nodeIds: string[], nodeById: Map<string, Node>): string[] {
  return [...nodeIds].sort((a, b) => {
    const na = nodeById.get(a)
    const nb = nodeById.get(b)

    const ay = na?.position?.y ?? 0
    const by = nb?.position?.y ?? 0
    if (ay !== by) return ay - by

    const ax = na?.position?.x ?? 0
    const bx = nb?.position?.x ?? 0
    if (ax !== bx) return ax - bx

    return String(a).localeCompare(String(b))
  })
}

export function sortOutgoingEdgeRefsByCanvasPosition(
  refs: OutgoingEdgeRef[],
  nodeById: Map<string, Node>
): OutgoingEdgeRef[] {
  return [...refs].sort((a, b) => {
    const na = nodeById.get(a.targetId)
    const nb = nodeById.get(b.targetId)

    const ay = na?.position?.y ?? 0
    const by = nb?.position?.y ?? 0
    if (ay !== by) return ay - by

    const ax = na?.position?.x ?? 0
    const bx = nb?.position?.x ?? 0
    if (ax !== bx) return ax - bx

    return String(a.targetId).localeCompare(String(b.targetId))
  })
}

export function wrapAstListAsSequenceIfNeeded(astList: BtAstNode[], sequenceName: string): BtAstNode {
  if (astList.length === 0) {
    return {
      kind: 'sequence',
      name: sequenceName,
      children: []
    } satisfies BtSequenceNode
  }

  if (astList.length === 1) {
    return astList[0]
  }

  return {
    kind: 'sequence',
    name: sequenceName,
    children: astList
  } satisfies BtSequenceNode
}

export function getNodePropertyValue(node: any, ...keys: string[]): unknown {
  const data = node?.data ?? {}
  const properties = data?.properties ?? {}
  const payload = data?.payload ?? {}
  const payloadProperties = payload?.properties ?? {}

  for (const key of keys) {
    if (properties[key] !== undefined) return properties[key]
    if (payloadProperties[key] !== undefined) return payloadProperties[key]
    if (data[key] !== undefined) return data[key]
    if (payload[key] !== undefined) return payload[key]
  }

  return undefined
}

export function getNodeNumberPropertyValue(node: any, fallback: number, ...keys: string[]): number {
  const value = getNodePropertyValue(node, ...keys)
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

;``
