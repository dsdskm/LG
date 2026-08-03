/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// BehaviorTree(BtAst) 기반 flow 시뮬레이터.
//
// 로봇이 실제 실행하는 것과 동일한 트리를 사용하기 위해, edge 를 직접 걷지 않고
// buildBehaviorTreeFromFlowDefinition() 가 만든 BtAst 트리를 BehaviorTree 방식으로
// "tick" 실행한다. 각 leaf(action) 의 반환값(SUCCESS/FAILURE/RUNNING)은 호출자가
// 노드별로 강제한 설정(resolve)으로 결정되고, 컨트롤 노드(sequence/ifThenElse/or 등)는
// BT 규칙대로 그 결과를 받아 다음 경로를 정한다.
//
// 산출물:
//  - trace : 실행 순서대로의 leaf 방문 목록(디버거가 한 스텝씩 따라감)
//  - spans : 컨트롤 노드(ifThenElse/or/parallel/repeat)가 차지하는 leaf 인덱스 구간.
//            자식(구간 내부)이 실행 중이면 부모 컨트롤 노드를 RUNNING 으로 표시하는 데 쓴다.
//

import { buildBehaviorTreeFromFlowDefinition } from '../build'
import { forceFailureNodeType } from '../nodes/btForceFailureNode'
import { forceSuccessNodeType } from '../nodes/btForceSuccessNode'
import { orNodeType } from '../nodes/btOrNode'
import { parallelNodeType } from '../nodes/btParallelNode'
import type { BtAstNode } from '../types'
import { sequenceNodeType, type BtSequenceNode } from '../nodes/btSequenceNode'
import { fallbackOnFailureNodeType } from '../nodes/btFallbackOnFailureNode'
import { ifThenElseNodeType } from '../nodes/btIfThenElseNode'
import { repeatNodeType } from '../nodes/btRepeatNode'
import { reactiveOrNodeType } from '../nodes/btReactiveOrNode'
import { actionNodeType } from '../nodes/btActionNode'
import { reactiveAndNodeType } from '../nodes/btReactiveAndNode'
import { retryUntilSuccessfulNodeType } from '../nodes/btRetryUntilSuccessfulNode'

export type SimStatus = 'SUCCESS' | 'FAILURE' | 'RUNNING'

export type Visit = {
  nodeId: string
  status: SimStatus
}

// 컨트롤 노드의 실행 구간. [start, end) 의 leaf 가 이 컨트롤의 서브트리.
export type ControlSpan = {
  nodeId: string
  start: number
  end: number
  status: SimStatus
  // ReactiveFallback(reactiveOr) 구간 여부. true 면 RUNNING 시 매 tick 첫 자식부터 재평가한다.
  reactive?: boolean
}

export type ResolveFn = (nodeId: string) => SimStatus

export function buildSimTrace(
  flowDefinition: any,
  startNodeId: string | null,
  resolve: ResolveFn
): { trace: Visit[]; spans: ControlSpan[]; model: BtSequenceNode | null; error: string | null } {
  const trace: Visit[] = []
  const spans: ControlSpan[] = []

  function exec(node: BtAstNode): SimStatus {
    switch (node.kind) {
      case actionNodeType: {
        const nodeId = String(node.attrs?.node_id ?? '')
        const status = resolve(nodeId)
        if (nodeId) trace.push({ nodeId, status })
        return status
      }

      case sequenceNodeType:
        return runSequence(node.children)
      case ifThenElseNodeType:
        return wrapControl(node, () => runIfThenElse(node.children))
      case orNodeType:
      case fallbackOnFailureNodeType:
        return wrapControl(node, () => runFallback(node.children))
      case reactiveOrNodeType:
        return wrapControl(node, () => runFallback(node.children), true)
      case reactiveAndNodeType:
        return wrapControl(node, () => runSequence(node.children), true)
      case parallelNodeType:
        return wrapControl(node, () => runParallel(node.children, node.successCount))
      case repeatNodeType:
        return wrapControl(node, () => runRepeat(node.child, node.numCycles))
      case retryUntilSuccessfulNodeType:
        return wrapControl(node, () => runRetry(node.child, node.numAttempts))
      case forceSuccessNodeType:
        return wrapControl(node, () => {
          const r = exec(node.child)
          return r === 'RUNNING' ? 'RUNNING' : 'SUCCESS'
        })
      case forceFailureNodeType:
        return wrapControl(node, () => {
          const r = exec(node.child)
          return r === 'RUNNING' ? 'RUNNING' : 'FAILURE'
        })
      default:
        return 'SUCCESS'
    }
  }

  // 컨트롤 노드를 실행하면서, 차지한 leaf 구간(span)을 기록한다.
  // reactive=true 면 RUNNING 시 매 tick 첫 자식부터 재평가하는 구간으로 표시한다.
  function wrapControl(
    node: BtAstNode & { attrs?: Record<string, string> },
    run: () => SimStatus,
    reactive = false
  ): SimStatus {
    const nodeId = String(node.attrs?.node_id ?? '')
    const start = trace.length
    const status = run()
    if (nodeId) spans.push({ nodeId, start, end: trace.length, status, reactive })
    return status
  }

  // Sequence: 자식을 순서대로 실행. RUNNING/FAILURE 가 나오면 즉시 중단, 모두 SUCCESS 면 SUCCESS.
  function runSequence(children: BtAstNode[]): SimStatus {
    for (const child of children) {
      const r = exec(child)
      if (r !== 'SUCCESS') return r
    }
    return 'SUCCESS'
  }

  // IfThenElse: children = [condition, then, else?].
  // condition SUCCESS → then 실행 후 그 결과, FAILURE → else 실행(없으면 FAILURE).
  function runIfThenElse(children: BtAstNode[]): SimStatus {
    const [cond, thenNode, elseNode] = children
    if (!cond) return 'SUCCESS'

    const c = exec(cond)
    if (c === 'RUNNING') return 'RUNNING'

    if (c === 'SUCCESS') {
      return thenNode ? exec(thenNode) : 'SUCCESS'
    }
    return elseNode ? exec(elseNode) : 'FAILURE'
  }

  // Or / FallbackOnFailure: 자식을 순서대로 시도, 하나라도 SUCCESS 면 SUCCESS, 모두 FAILURE 면 FAILURE.
  function runFallback(children: BtAstNode[]): SimStatus {
    for (const child of children) {
      const r = exec(child)
      if (r === 'RUNNING') return 'RUNNING'
      if (r === 'SUCCESS') return 'SUCCESS'
      // FAILURE → 다음 분기 시도
    }
    return 'FAILURE'
  }

  // Parallel: 모든 자식 실행(시뮬레이션은 순차 방문). successCount 이상 성공하면 SUCCESS.
  function runParallel(children: BtAstNode[], successCount: number): SimStatus {
    let success = 0
    for (const child of children) {
      const r = exec(child)
      if (r === 'RUNNING') return 'RUNNING'
      if (r === 'SUCCESS') success++
    }
    const need = successCount > 0 ? successCount : children.length
    return success >= need ? 'SUCCESS' : 'FAILURE'
  }

  // Repeat: 자식을 numCycles 회 반복(무한/과대값은 안전하게 제한). 도중 비-SUCCESS 면 중단.
  function runRepeat(child: BtAstNode, numCycles: number): SimStatus {
    const cycles = Number.isFinite(numCycles) && numCycles > 0 ? Math.min(numCycles, 100) : 1
    for (let i = 0; i < cycles; i++) {
      const r = exec(child)
      if (r !== 'SUCCESS') return r
    }
    return 'SUCCESS'
  }

  // RetryUntilSuccessful: 자식이 SUCCESS 면 성공, FAILURE 면 최대 numAttempts 회 재시도.
  // RUNNING 이면 RUNNING(대기), 모든 시도 실패면 FAILURE.
  function runRetry(child: BtAstNode, numAttempts: number): SimStatus {
    const attempts = Number.isFinite(numAttempts) && numAttempts > 0 ? Math.min(numAttempts, 100) : 1
    for (let i = 0; i < attempts; i++) {
      const r = exec(child)
      if (r === 'RUNNING') return 'RUNNING'
      if (r === 'SUCCESS') return 'SUCCESS'
      // FAILURE → 다음 시도
    }
    return 'FAILURE'
  }

  try {
    const { model } = buildBehaviorTreeFromFlowDefinition(flowDefinition)
    exec(model)

    // START(ROOT) 노드는 BtAst 에 없으므로(루트 시퀀스로 표현됨) 시작 지점으로 앞에 붙인다.
    // 이로 인해 모든 leaf 인덱스가 1 밀리므로 span 인덱스도 같이 보정한다.
    const offset = startNodeId ? 1 : 0
    const fullTrace: Visit[] = startNodeId ? [{ nodeId: startNodeId, status: 'SUCCESS' }, ...trace] : trace
    const fullSpans = spans.map((s) => ({ ...s, start: s.start + offset, end: s.end + offset }))

    return { trace: fullTrace, spans: fullSpans, model, error: null }
  } catch (e: any) {
    return { trace: [], spans: [], model: null, error: String(e?.message ?? e) }
  }
}
