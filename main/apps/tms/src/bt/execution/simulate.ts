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
import type { BtAstNode, BtSequenceNode } from '../types'

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
      case 'action': {
        const nodeId = String(node.attrs?.node_id ?? '')
        const status = resolve(nodeId)
        if (nodeId) trace.push({ nodeId, status })
        return status
      }
      case 'sequence':
        return runSequence(node.children)
      case 'ifThenElse':
        return wrapControl(node, () => runIfThenElse(node.children))
      case 'or':
      case 'fallbackOnFailure':
        return wrapControl(node, () => runFallback(node.children))
      case 'parallel':
        return wrapControl(node, () => runParallel(node.children, node.successCount))
      case 'repeat':
        return wrapControl(node, () => runRepeat(node.child, node.numCycles))
      case 'forceSuccess': {
        const r = exec(node.child)
        return r === 'RUNNING' ? 'RUNNING' : 'SUCCESS'
      }
      default:
        return 'SUCCESS'
    }
  }

  // 컨트롤 노드를 실행하면서, 차지한 leaf 구간(span)을 기록한다.
  function wrapControl(node: BtAstNode & { attrs?: Record<string, string> }, run: () => SimStatus): SimStatus {
    const nodeId = String(node.attrs?.node_id ?? '')
    const start = trace.length
    const status = run()
    if (nodeId) spans.push({ nodeId, start, end: trace.length, status })
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
