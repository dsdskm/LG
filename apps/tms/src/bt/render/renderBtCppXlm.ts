import type { BtAstNode, BtSequenceNode } from '../types'
import { attrsToString, escapeXmlAttr } from './xml'

export function renderBehaviorTreeXml(root: BtSequenceNode): string {
  const indent = '  '
  const lines: string[] = []

  lines.push(`<root BTCPP_format="4">`)
  lines.push(`${indent}<BehaviorTree ID="MainTree">`)
  lines.push(renderAstNode(root, 2))
  lines.push(`${indent}</BehaviorTree>`)
  lines.push(`</root>`)

  return lines.join('\n')
}

function renderAstNode(node: BtAstNode, depth: number): string {
  const indent = '  '
  const pad = indent.repeat(depth)

  if (node.kind === 'action') {
    return `${pad}<Action${attrsToString({ ID: node.tag, name: node.name, ...node.attrs })}/>`
  }

  if (node.kind === 'or') {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')
    const attrs = attrsToString({
      name: node.name,
      ...(node.attrs ?? {})
    })

    if (!childrenXml) return `${pad}<Fallback${attrs}/>`
    return `${pad}<Fallback${attrs}>\n${childrenXml}\n${pad}</Fallback>`
  }

  if (node.kind === 'parallel') {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      success_count: String(node.successCount),
      failure_count: String(node.failureCount),
      ...(node.attrs ?? {})
    })

    if (!childrenXml) return `${pad}<Parallel${attrs}/>`
    return `${pad}<Parallel${attrs}>\n${childrenXml}\n${pad}</Parallel>`
  }

  if (node.kind === 'forceSuccess') {
    const childXml = renderAstNode(node.child, depth + 1)
    return `${pad}<ForceSuccess>\n${childXml}\n${pad}</ForceSuccess>`
  }

  if (node.kind === 'repeat') {
    const childXml = renderAstNode(node.child, depth + 1)

    const attrs = attrsToString({
      name: node.name,
      num_cycles: String(node.numCycles),
      ...(node.attrs ?? {})
    })

    return `${pad}<Repeat${attrs}>\n${childXml}\n${pad}</Repeat>`
  }

  if (node.kind === 'ifThenElse') {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      ...(node.attrs ?? {})
    })

    return `${pad}<IfThenElse${attrs}>\n${childrenXml}\n${pad}</IfThenElse>`
  }

  if (node.kind === 'fallbackOnFailure') {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      ...(node.attrs ?? {})
    })

    if (!childrenXml) return `${pad}<Fallback${attrs}/>`
    return `${pad}<Fallback${attrs}>\n${childrenXml}\n${pad}</Fallback>`
  }

  const childrenXml = node.children.map((child) => renderAstNode(child, depth + 1)).join('\n')

  if (!childrenXml) {
    return `${pad}<Sequence name="${escapeXmlAttr(node.name)}"/>`
  }

  return `${pad}<Sequence name="${escapeXmlAttr(node.name)}">\n${childrenXml}\n${pad}</Sequence>`
}
