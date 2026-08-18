/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import styled from 'styled-components'
import type { BtAstNode } from '@/bt/types'
import type { SimStatus } from '@/bt/execution/simulate'
import { PropertyPanelWrap, PropertyPanelHeader } from './styles'
import { parallelNodeType } from '@/bt/nodes/btParallelNode'
import { forceFailureNodeType } from '@/bt/nodes/btForceFailureNode'
import { forceSuccessNodeType } from '@/bt/nodes/btForceSuccessNode'
import { orNodeType } from '@/bt/nodes/btOrNode'
import { andNodeType } from '@/bt/nodes/btAndNode'
import { fallbackOnFailureNodeType } from '@/bt/nodes/btFallbackOnFailureNode'
import { ifThenElseNodeType } from '@/bt/nodes/btIfThenElseNode'
import { repeatNodeType } from '@/bt/nodes/btRepeatNode'
import { sequenceNodeType } from '@/bt/nodes/btSequenceNode'
import { actionNodeType } from '@/bt/nodes/btActionNode'
import { reactiveOrNodeType } from '@/bt/nodes/btReactiveOrNode'
import { reactiveAndNodeType } from '@/bt/nodes/btReactiveAndNode'
import { retryUntilSuccessfulNodeType } from '@/bt/nodes/btRetryUntilSuccessfulNode'
import { btPreconditionNodeType } from '@/bt/nodes/btPreconditionNode'
import { btDelayNodeType } from '@/bt/nodes/btDelayNode'
import { btTimeoutNodeType } from '@/bt/nodes/btTimeoutNode'

// 로컬 개발용: buildBehaviorTree 결과(BtAst)를 텍스트 트리로 보여주고,
// tick 진행에 따라 각 노드의 RUNNING/SUCCESS/FAILURE 를 함께 표시한다.
// 왼쪽 캔버스 흐름과 오른쪽 BT 구조가 맞는지 대조하는 용도.

type Props = {
  model: BtAstNode | null
  statusById: Record<string, SimStatus>
  startNodeId: string | null
  error?: string | null
}

type Line = {
  depth: number
  label: string
  nodeId: string | null
  status?: SimStatus
}

function getNodeId(node: any): string | null {
  const id = node?.attrs?.node_id
  return id ? String(id) : null
}

function childrenOf(node: BtAstNode): BtAstNode[] {
  switch (node.kind) {
    case sequenceNodeType:
    case ifThenElseNodeType:
    case orNodeType:
    case andNodeType:
    case reactiveOrNodeType:
    case reactiveAndNodeType:
    case fallbackOnFailureNodeType:
    case parallelNodeType:
      return node.children ?? []
    case repeatNodeType:
    case retryUntilSuccessfulNodeType:
    case forceSuccessNodeType:
    case forceFailureNodeType:
    case btPreconditionNodeType:
    case btDelayNodeType:
    case btTimeoutNodeType:
      return node.child ? [node.child] : []
    default:
      return []
  }
}

function labelOf(node: BtAstNode): string {
  switch (node.kind) {
    case actionNodeType:
      return `${node.tag}${node.name ? ` "${node.name}"` : ''}`
    case sequenceNodeType:
      return `Sequence${node.name ? ` (${node.name})` : ''}`
    case ifThenElseNodeType:
      return 'IfThenElse'
    case orNodeType:
      return 'Or'
    case andNodeType:
      return 'And'
    case reactiveOrNodeType:
      return 'ReactiveOr'
    case reactiveAndNodeType:
      return 'ReactiveAnd'
    case fallbackOnFailureNodeType:
      return 'Fallback'
    case parallelNodeType:
      return `Parallel (success≥${node.successCount})`
    case repeatNodeType:
      return `Repeat (x${node.numCycles})`
    case retryUntilSuccessfulNodeType:
      return `RetryUntilSuccessful (x${node.numAttempts})`
    case forceSuccessNodeType:
      return 'ForceSuccess'
    case forceFailureNodeType:
      return 'ForceFailure'
    case btPreconditionNodeType:
      return 'PreCondition'
    case btDelayNodeType:
      return 'Delay'
    case btTimeoutNodeType:
      return 'Timeout'
    default:
      return (node as any).kind
  }
}

function flatten(node: BtAstNode, depth: number, statusById: Record<string, SimStatus>, out: Line[]) {
  const nodeId = getNodeId(node)
  out.push({
    depth,
    label: labelOf(node),
    nodeId,
    status: nodeId ? statusById[nodeId] : undefined
  })
  for (const child of childrenOf(node)) {
    flatten(child, depth + 1, statusById, out)
  }
}

const STATUS_COLOR: Record<SimStatus, string> = {
  RUNNING: '#2563eb',
  SUCCESS: '#16a34a',
  FAILURE: '#dc2626'
}

export default function AstView({ model, statusById, startNodeId, error }: Props) {
  const lines: Line[] = []
  if (model) {
    // START(ROOT) 는 BtAst 에 없으므로 맨 위에 합성해 캔버스와 1:1 로 맞춘다.
    lines.push({
      depth: 0,
      label: 'START',
      nodeId: startNodeId,
      status: startNodeId ? statusById[startNodeId] : undefined
    })
    for (const child of childrenOf(model)) {
      flatten(child, 1, statusById, lines)
    }
  }

  return (
    <PropertyPanelWrap>
      <PropertyPanelHeader>Behavior Tree (AST)</PropertyPanelHeader>

      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : (
        <Body>
          {lines.map((line, idx) => {
            const color = line.status ? STATUS_COLOR[line.status] : undefined
            return (
              <Row key={idx} style={{ paddingLeft: 8 + line.depth * 16 }}>
                <Dot $color={color} />
                <Label $color={color}>{line.label}</Label>
                {line.nodeId && <NodeId>#{line.nodeId}</NodeId>}
                {line.status && <StatusTag $color={color}>{line.status}</StatusTag>}
              </Row>
            )
          })}
        </Body>
      )}
    </PropertyPanelWrap>
  )
}

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`

const Dot = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid ${({ $color }) => $color ?? '#cbd5e1'};
  background: ${({ $color }) => $color ?? 'transparent'};
`

const Label = styled.span<{ $color?: string }>`
  font-weight: 700;
  color: ${({ $color }) => $color ?? '#334155'};
`

const NodeId = styled.span`
  color: #94a3b8;
`

const StatusTag = styled.span<{ $color?: string }>`
  margin-left: 2px;
  font-size: 10px;
  font-weight: 700;
  color: ${({ $color }) => $color ?? '#94a3b8'};
`

const ErrorBox = styled.div`
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #be123c;
  white-space: pre-wrap;
  word-break: break-word;
`
