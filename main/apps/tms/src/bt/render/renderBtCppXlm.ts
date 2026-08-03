import { forceFailureNodeType } from '../nodes/btForceFailureNode'
import { forceSuccessNodeType } from '../nodes/btForceSuccessNode'
import { orNodeType } from '../nodes/btOrNode'
import { parallelNodeType } from '../nodes/btParallelNode'
import type { BtAstNode } from '../types'
import type { BtSequenceNode } from '../nodes/btSequenceNode'
import { attrsToString, escapeXmlAttr } from './xml'
import { fallbackOnFailureNodeType } from '../nodes/btFallbackOnFailureNode'
import { ifThenElseNodeType } from '../nodes/btIfThenElseNode'
import { repeatNodeType } from '../nodes/btRepeatNode'
import { reactiveOrNodeType } from '../nodes/btReactiveOrNode'
import { actionNodeType } from '../nodes/btActionNode'
import { reactiveAndNodeType } from '../nodes/btReactiveAndNode'
import { retryUntilSuccessfulNodeType } from '../nodes/btRetryUntilSuccessfulNode'

// 제어 노드(Sequence/Parallel/Repeat 등)는 node_id 를 XML 로 내보내지 않는다.
// node_id 는 시뮬레이터/검증이 attrs 로 내부 참조하므로 AST 에는 남기고, 렌더링 시에만 제외한다.
// (Action 태그에는 node_id 를 그대로 유지)
function omitNodeId(attrs?: Record<string, string>): Record<string, string> {
  if (!attrs) return {}
  const rest = { ...attrs }
  delete rest.node_id
  return rest
}

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

  if (node.kind === actionNodeType) {
    return `${pad}<Action${attrsToString({ ID: node.tag, name: node.name, ...node.attrs })}/>`
  }

  if (node.kind === orNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')
    const attrs = attrsToString({
      name: node.name,
      ...omitNodeId(node.attrs)
    })

    if (!childrenXml) return `${pad}<Fallback${attrs}/>`
    return `${pad}<Fallback${attrs}>\n${childrenXml}\n${pad}</Fallback>`
  }

  if (node.kind === reactiveAndNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')
    const attrs = attrsToString({
      name: node.name,
      ...omitNodeId(node.attrs)
    })

    if (!childrenXml) return `${pad}<ReactiveSequence${attrs}/>`
    return `${pad}<ReactiveSequence${attrs}>\n${childrenXml}\n${pad}</ReactiveSequence>`
  }

  if (node.kind === parallelNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      success_count: String(node.successCount),
      failure_count: String(node.failureCount),
      ...omitNodeId(node.attrs)
    })

    if (!childrenXml) return `${pad}<Parallel${attrs}/>`
    return `${pad}<Parallel${attrs}>\n${childrenXml}\n${pad}</Parallel>`
  }

  if (node.kind === forceSuccessNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)
    const attrs = attrsToString({ ...(node.name ? { name: node.name } : {}), ...omitNodeId(node.attrs) })
    return `${pad}<ForceSuccess${attrs}>\n${childXml}\n${pad}</ForceSuccess>`
  }

  if (node.kind === forceFailureNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)
    const attrs = attrsToString({ ...(node.name ? { name: node.name } : {}), ...omitNodeId(node.attrs) })
    return `${pad}<ForceFailure${attrs}>\n${childXml}\n${pad}</ForceFailure>`
  }

  if (node.kind === repeatNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)

    const attrs = attrsToString({
      name: node.name,
      num_cycles: String(node.numCycles),
      ...omitNodeId(node.attrs)
    })

    return `${pad}<Repeat${attrs}>\n${childXml}\n${pad}</Repeat>`
  }

  if (node.kind === retryUntilSuccessfulNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)

    const attrs = attrsToString({
      name: node.name,
      num_attempts: String(node.numAttempts),
      ...omitNodeId(node.attrs)
    })

    return `${pad}<RetryUntilSuccessful${attrs}>\n${childXml}\n${pad}</RetryUntilSuccessful>`
  }

  if (node.kind === ifThenElseNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      ...omitNodeId(node.attrs)
    })

    return `${pad}<IfThenElse${attrs}>\n${childrenXml}\n${pad}</IfThenElse>`
  }

  if (node.kind === fallbackOnFailureNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      ...omitNodeId(node.attrs)
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
