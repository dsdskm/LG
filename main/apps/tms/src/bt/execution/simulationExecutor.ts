/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// FlowExecutor 의 시뮬레이터 구현.
//
// buildSimTrace(BtAst tick 실행 순서)를 이용해, 실제 로봇 없이 각 노드의 결과를
// 사용자가 강제한 설정(resolve)으로 계산한다. step() 을 호출할 때마다 cursor 를 한 칸
// 전진시키고, 이미 지나간(수행된) 노드의 결과는 내부에 고정(freeze)해 둔다.
// → 나중에 강제값을 바꿔도 이미 수행된 결과는 변하지 않고, 미실행 노드만 현재 설정을 따른다.

import { buildSimTrace, type ControlSpan, type ResolveFn } from './simulate'
import type { ExecSnapshot, ExecStatus, FlowExecutor } from './executor'
import { EMPTY_SNAPSHOT } from './executor'

// cursor 를 포함하는 reactiveOr 구간 중 가장 바깥(start 가 가장 작은) 것의 시작 인덱스를 반환.
// 없으면 null. 중첩 시 바깥 ReactiveFallback 이 매 tick 첫 자식부터 재평가하므로 outermost 기준.
function findReactiveSpanStart(spans: ControlSpan[], cursor: number): number | null {
  let best: number | null = null
  for (const span of spans) {
    if (span.reactive && cursor >= span.start && cursor < span.end) {
      if (best === null || span.start < best) best = span.start
    }
  }
  return best
}

export class SimulationExecutor implements FlowExecutor {
  readonly kind = 'simulation' as const

  private cursor = -1
  private frozen: Record<string, ExecStatus> = {}
  private snapshot: ExecSnapshot = EMPTY_SNAPSHOT
  // 같은 노드에 tick 이 연속으로 머무른 횟수(강제 RUNNING 재실행 표시용)
  private prevCurrentId: string | null = null
  private runningTicks = 0
  // 현재 RUNNING 인 leaf. reactive 재-워크로 커서가 앞으로 되돌아가도 이 노드는 RUNNING 을 유지한다.
  private runningLeafId: string | null = null

  constructor(
    private readonly flowDefinition: any,
    private readonly startNodeId: string | null,
    // 노드별 강제 결과를 반환(현재 설정을 실시간으로 읽도록 호출자가 주입)
    private readonly resolve: ResolveFn
  ) {}

  reset(): void {
    this.cursor = -1
    this.frozen = {}
    this.snapshot = EMPTY_SNAPSHOT
    this.prevCurrentId = null
    this.runningTicks = 0
    this.runningLeafId = null
  }

  getSnapshot(): ExecSnapshot {
    return this.snapshot
  }

  async step(): Promise<ExecSnapshot> {
    // 현재 설정 기준으로 실행 순서(trace)와 컨트롤 구간(spans)을 계산.
    // (미실행 구간은 최신 설정을 반영, 이미 지난 구간은 아래 freeze 로 보존)
    const { trace, spans } = buildSimTrace(this.flowDefinition, this.startNodeId, this.resolve)

    // 기억해 둔 RUNNING leaf 가 현재 trace 에서 더 이상 RUNNING 이 아니면(예: 강제결과가 바뀌어 해소) 해제
    if (this.runningLeafId && !trace.some((v) => v.nodeId === this.runningLeafId && v.status === 'RUNNING')) {
      this.runningLeafId = null
    }

    if (this.cursor < 0) {
      // 미시작 → 첫 노드로
      this.cursor = trace.length > 0 ? 0 : -1
    } else {
      const cur = trace[this.cursor]
      if (cur && cur.status === 'RUNNING') {
        // RUNNING 노드가 reactiveOr(ReactiveFallback) 안이면, 다음 tick 에 그 구간의 첫 자식부터
        // 다시 평가한다(순서대로 재실행). 일반 Or/Fallback 이면 그 자리에 머문다(래치).
        const reactiveStart = findReactiveSpanStart(spans, this.cursor)
        if (reactiveStart !== null) {
          this.cursor = reactiveStart
        }
      } else {
        this.cursor = this.cursor + 1
      }
    }

    const finished = trace.length === 0 || this.cursor >= trace.length

    // 새로 지나간 leaf/컨트롤의 결과를 고정(최초 1회만).
    for (let k = 0; k < Math.min(this.cursor, trace.length); k++) {
      if (!(trace[k].nodeId in this.frozen)) {
        this.frozen[trace[k].nodeId] = trace[k].status
      }
    }
    for (const span of spans) {
      if (this.cursor >= span.end && !(span.nodeId in this.frozen)) {
        this.frozen[span.nodeId] = span.status
      }
    }

    // 스냅샷 구성: 고정된 결과 + 진행 중 컨트롤/leaf 는 RUNNING
    const statusById: Record<string, ExecStatus> = { ...this.frozen }
    for (const span of spans) {
      if (this.cursor >= span.start && this.cursor < span.end) {
        statusById[span.nodeId] = 'RUNNING'
      }
    }
    const currentNodeId = !finished && this.cursor >= 0 && this.cursor < trace.length ? trace[this.cursor].nodeId : null
    if (currentNodeId) {
      statusById[currentNodeId] = 'RUNNING'
    }

    // 현재 커서 leaf 가 RUNNING 이면 기억. reactive 재-워크로 커서가 앞으로 돌아가도
    // 이 leaf 는 계속 RUNNING 으로 표시한다(도중에 IDLE 로 바뀌지 않게).
    const cursorLeaf = this.cursor >= 0 && this.cursor < trace.length ? trace[this.cursor] : undefined
    if (cursorLeaf && cursorLeaf.status === 'RUNNING') {
      this.runningLeafId = cursorLeaf.nodeId
    }
    if (this.runningLeafId) {
      statusById[this.runningLeafId] = 'RUNNING'
    }

    // 같은 노드에 계속 머무르면(강제 RUNNING) 카운트 증가, 다른 노드로 넘어가면 1 로 리셋
    if (currentNodeId && currentNodeId === this.prevCurrentId) {
      this.runningTicks += 1
    } else {
      this.runningTicks = currentNodeId ? 1 : 0
    }
    this.prevCurrentId = currentNodeId
    const runningCountById: Record<string, number> = currentNodeId ? { [currentNodeId]: this.runningTicks } : {}

    this.snapshot = { statusById, currentNodeId, finished, runningCountById }
    return this.snapshot
  }
}
