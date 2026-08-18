import { forceFailureNodeType } from '../nodes/btForceFailureNode'
import { forceSuccessNodeType } from '../nodes/btForceSuccessNode'
import { btPreconditionNodeType } from '../nodes/btPreconditionNode'
import { orNodeType } from '../nodes/btOrNode'
import { andNodeType } from '../nodes/btAndNode'
import { parallelFailureCountProp, parallelNodeType, parallelSuccessCountProp } from '../nodes/btParallelNode'
import type { BtAstNode } from '../types'
import type { BtSequenceNode } from '../nodes/btSequenceNode'
import { attrsToString, escapeXmlAttr } from './xml'
import { fallbackOnFailureNodeType } from '../nodes/btFallbackOnFailureNode'
import { ifThenElseNodeType } from '../nodes/btIfThenElseNode'
import { repeatNodeType, repeatNumCyclesProp } from '../nodes/btRepeatNode'
import { actionNodeType } from '../nodes/btActionNode'
import { reactiveAndNodeType } from '../nodes/btReactiveAndNode'
import { retryUntilSuccessfulNodeType, retryUntilSuccessfulNumAttemptsProp } from '../nodes/btRetryUntilSuccessfulNode'
import { btDelayNodeType } from '../nodes/btDelayNode'
import { btTimeoutNodeType } from '../nodes/btTimeoutNode'
import { reactiveOrNodeType } from '../nodes/btReactiveOrNode'

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

  // And 는 BT.CPP 에 대응 태그가 없어 Sequence 로 내보낸다(자식을 순서대로 실행, 하나라도 실패면 실패).
  if (node.kind === andNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')
    const attrs = attrsToString({
      name: node.name,
      ...omitNodeId(node.attrs)
    })

    if (!childrenXml) return `${pad}<Sequence${attrs}/>`
    return `${pad}<Sequence${attrs}>\n${childrenXml}\n${pad}</Sequence>`
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

  if (node.kind === reactiveOrNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')
    const attrs = attrsToString({
      name: node.name,
      ...(node.attrs ?? {})
    })

    if (!childrenXml) return `${pad}<ReactiveFallback${attrs}/>`
    return `${pad}<ReactiveFallback${attrs}>\n${childrenXml}\n${pad}</ReactiveFallback>`
  }

  if (node.kind === parallelNodeType) {
    const childrenXml = node.children.map((c) => renderAstNode(c, depth + 1)).join('\n')

    const attrs = attrsToString({
      name: node.name,
      [parallelSuccessCountProp]: String(node.successCount),
      [parallelFailureCountProp]: String(node.failureCount),
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

  if (node.kind === btPreconditionNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)
    // attrs 에 if/else 가 실려 있음(node_id 는 omit). BT.CPP: <Precondition if="..." else="...">
    const attrs = attrsToString({ ...(node.name ? { name: node.name } : {}), ...omitNodeId(node.attrs) })
    return `${pad}<Precondition${attrs}>\n${childXml}\n${pad}</Precondition>`
  }

  if (node.kind === btDelayNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)
    const attrs = attrsToString({ ...omitNodeId(node.attrs) })
    return `${pad}<Delay${attrs}>\n${childXml}\n${pad}</Delay>`
  }

  if (node.kind === btTimeoutNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)
    const attrs = attrsToString({ ...omitNodeId(node.attrs) })
    return `${pad}<Timeout${attrs}>\n${childXml}\n${pad}</Timeout>`
  }

  if (node.kind === repeatNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)

    const attrs = attrsToString({
      name: node.name,
      [repeatNumCyclesProp]: String(node.numCycles),
      ...omitNodeId(node.attrs)
    })

    return `${pad}<Repeat${attrs}>\n${childXml}\n${pad}</Repeat>`
  }

  if (node.kind === retryUntilSuccessfulNodeType) {
    const childXml = renderAstNode(node.child, depth + 1)

    const attrs = attrsToString({
      name: node.name,
      [retryUntilSuccessfulNumAttemptsProp]: String(node.numAttempts),
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
