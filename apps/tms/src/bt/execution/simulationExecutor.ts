/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// FlowExecutor 의 시뮬레이터 구현.
//
// 모델(이해를 위한 요약):
//  - 매 step 마다 buildSimTrace 가 "현재 resolve 기준 한 tick 실행 순서(trace)"와 컨트롤 구간(spans)을
//    새로 만든다. trace 는 leaf 방문 순서의 평평한 배열이고, cursor 는 그 위를 걷는 단일 포인터다.
//  - cursor 이동 규칙(advanceCursor):
//      · 일반          : 한 칸 전진
//      · reactiveFallback    : RUNNING 이면 그 구간 시작으로 되돌림(매 tick 첫 자식부터 재평가)
//      · parallel      : RUNNING 구간에 "park" — 한 step = 그 parallel 의 1 tick(자식을 개별 순회하지 않음),
//                        resolve 되면 구간 뒤로 진행
//  - frozen : 이미 지나간(실행된) 노드 결과 보존. resolve 가 나중에 바뀌어도 과거 결과는 안 변한다.
//  - 스냅샷 색상 = frozen + 진행 중 컨트롤 + parallel frontier + 현재 노드 + reactive RUNNING leaf.
//
// step() 은 위 단계를 순서대로 부르는 파이프라인이고, 각 단계는 아래 private 메서드에 있다.

import { buildSimTrace, type ControlSpan, type ResolveFn, type Visit } from './simulate'
import type { ExecSnapshot, ExecStatus, FlowExecutor } from './executor'
import { EMPTY_SNAPSHOT } from './executor'

// cursor 를 포함하는 reactiveFallback 구간 중 가장 바깥(start 가 가장 작은) 것의 시작 인덱스를 반환.
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

// cursor 를 포함하는 parallel 구간(상태 무관) 중 가장 바깥 것. 없으면 null.
// BT.CPP Parallel 은 한 tick 에 모든 자식을 tick 하므로, 디버거도 parallel 을 한 덩어리로 처리한다:
// RUNNING 이면 park(여러 tick), 즉시 resolve(SUCCESS/FAILURE)면 한 step 에 구간 끝으로 건너뛴다
// (개별 자식을 순회하지 않음). 그 진입 판정에 쓴다.
function findOutermostParallelSpan(spans: ControlSpan[], cursor: number): ControlSpan | null {
  let best: ControlSpan | null = null
  for (const span of spans) {
    if (span.parallel && cursor >= span.start && cursor < span.end) {
      if (best === null || span.start < best.start) best = span
    }
  }
  return best
}

export class SimulationExecutor implements FlowExecutor {
  readonly kind = 'simulation' as const

  // trace 위를 걷는 단일 포인터.
  private cursor = -1
  // 이미 실행된(지나간) 노드 결과. resolve 가 나중에 바뀌어도 과거 결과는 이걸로 보존한다.
  private frozen: Record<string, ExecStatus> = {}
  private snapshot: ExecSnapshot = EMPTY_SNAPSHOT
  // 노드별 "연속 몇 tick 째 RUNNING 인지"(우하단 tick 뱃지용). parallel frontier 는 동시에 여러 개일 수 있어 map.
  private runningTicksById: Record<string, number> = {}
  // reactive(ReactiveFallback) RUNNING frontier leaf. 재-워크로 커서가 앞으로 돌아가도 RUNNING 유지.
  private runningLeafId: string | null = null
  // "한 덩어리로 tick 중"인 parallel 노드 id(park). 있으면 한 step = 이 parallel 의 1 tick.
  private parkedParallelId: string | null = null

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
    this.runningTicksById = {}
    this.runningLeafId = null
    this.parkedParallelId = null
  }

  getSnapshot(): ExecSnapshot {
    return this.snapshot
  }

  // 한 tick 진행. (모델 설명은 파일 상단 주석 참고)
  async step(): Promise<ExecSnapshot> {
    const { trace, spans } = buildSimTrace(this.flowDefinition, this.startNodeId, this.resolve)

    this.pruneRunningLeaf(trace)
    this.advanceCursor(trace, spans)

    const finished = trace.length === 0 || this.cursor >= trace.length

    this.updateFrozen(trace, spans)
    this.updateRunningLeaf(trace)

    // parallel 을 tick 중이면 "현재 노드"가 단일이 아니므로 null.
    const currentNodeId =
      !finished && !this.parkedParallelId && this.cursor >= 0 && this.cursor < trace.length
        ? trace[this.cursor].nodeId
        : null

    const statusById = this.buildStatusById(trace, spans, currentNodeId)
    const runningCountById = this.updateRunningCounts(trace, spans, currentNodeId)

    this.snapshot = { statusById, currentNodeId, finished, runningCountById }
    return this.snapshot
  }

  // ── step 파이프라인 단계들 ──

  // 기억해 둔 reactive RUNNING leaf 가 현재 trace 에서 더 이상 RUNNING 이 아니면(강제결과 변경 등) 해제.
  private pruneRunningLeaf(trace: Visit[]): void {
    if (this.runningLeafId && !trace.some((v) => v.nodeId === this.runningLeafId && v.status === 'RUNNING')) {
      this.runningLeafId = null
    }
  }

  // 커서를 한 tick 만큼 이동. parallel park / reactive 되돌림 / 일반 전진 중 하나.
  // 이동 후 parallel 구간에 들어갔으면 한 덩어리로 처리한다:
  //  - RUNNING  → 구간 시작에 park(이후 한 step = 이 parallel 의 1 tick)
  //  - 즉시 resolve → 한 step 에 구간 끝으로 건너뜀(자식들이 한꺼번에 결과 표시)
  private advanceCursor(trace: Visit[], spans: ControlSpan[]): void {
    if (this.parkedParallelId) {
      // parallel 을 한 덩어리로 tick 중: 아직 RUNNING 이면 한 tick 더(구간 시작에 park 유지),
      // resolve(또는 구조 변화) 됐으면 구간 뒤로 진행하고 park 해제.
      const span = spans.find((s) => s.parallel && s.nodeId === this.parkedParallelId)
      if (span && span.status === 'RUNNING') {
        this.cursor = span.start
      } else {
        this.cursor = span ? span.end : this.cursor + 1
        this.parkedParallelId = null
      }
    } else if (this.cursor < 0) {
      // 미시작 → 첫 노드로
      this.cursor = trace.length > 0 ? 0 : -1
    } else {
      const cur = trace[this.cursor]
      if (cur && cur.status === 'RUNNING') {
        // reactiveFallback 안이면 그 구간 첫 자식부터 재평가, 일반 Fallback 이면 그 자리에 머문다(래치).
        const reactiveStart = findReactiveSpanStart(spans, this.cursor)
        this.cursor = reactiveStart !== null ? reactiveStart : this.cursor
      } else {
        this.cursor = this.cursor + 1
      }
    }

    if (!this.parkedParallelId) {
      const par = findOutermostParallelSpan(spans, this.cursor)
      if (par) {
        if (par.status === 'RUNNING') {
          this.parkedParallelId = par.nodeId
          this.cursor = par.start
        } else {
          // 즉시 resolve 된 parallel: 한 step 에 구간 전체를 건너뛰어 자식들이 한꺼번에 결과 표시.
          this.cursor = par.end
        }
      }
    }
  }

  // 커서가 지나간 leaf/컨트롤 결과를 최초 1회 고정. RUNNING leaf 는 고정하지 않는다
  // (parallel 은 RUNNING 자식을 지나쳐 진행하므로, 고정하면 해소된 뒤에도 RUNNING 으로 남는다).
  private updateFrozen(trace: Visit[], spans: ControlSpan[]): void {
    for (let k = 0; k < Math.min(this.cursor, trace.length); k++) {
      if (trace[k].status !== 'RUNNING' && !(trace[k].nodeId in this.frozen)) {
        this.frozen[trace[k].nodeId] = trace[k].status
      }
    }
    // 현재 park 중인 parallel 의 완료(SUCCESS/FAILURE) 자식만 고정한다.
    // (park 로 커서가 구간 시작에 머물러 위 k<cursor 로 못 잡으므로 별도 처리. 재-tick 중 완료 색 유지)
    // ※ 아직 진입하지 않은 parallel 은 건드리지 않는다 — 미리 완료로 굳어 "먼저 끝난 것처럼" 보이는 문제 방지.
    if (this.parkedParallelId) {
      const span = spans.find((s) => s.parallel && s.status === 'RUNNING' && s.nodeId === this.parkedParallelId)
      if (span) {
        for (let k = span.start; k < span.end && k < trace.length; k++) {
          if (trace[k].status !== 'RUNNING' && !(trace[k].nodeId in this.frozen)) {
            this.frozen[trace[k].nodeId] = trace[k].status
          }
        }
      }
    }
    for (const span of spans) {
      if (this.cursor >= span.end && !(span.nodeId in this.frozen)) {
        this.frozen[span.nodeId] = span.status
      }
    }
  }

  // 커서 leaf 가 RUNNING 이면 기억(reactive 재-워크 중에도 RUNNING 유지). parallel 자식은 제외
  // (frontier 하이라이트가 처리; 여기서 잡으면 parallel 해소 후에도 단일 leaf 가 파랑으로 남을 수 있음).
  private updateRunningLeaf(trace: Visit[]): void {
    const cursorLeaf = this.cursor >= 0 && this.cursor < trace.length ? trace[this.cursor] : undefined
    if (cursorLeaf && cursorLeaf.status === 'RUNNING' && !this.parkedParallelId) {
      this.runningLeafId = cursorLeaf.nodeId
    }
  }

  // park 중인 parallel 의 frontier(구간 내 RUNNING) 자식 leaf id 들. 한 tick 에 함께 실행되는 것들.
  private parkedFrontierRunningIds(trace: Visit[], spans: ControlSpan[]): string[] {
    if (!this.parkedParallelId) return []
    const span = spans.find((s) => s.parallel && s.nodeId === this.parkedParallelId)
    if (!span || span.status !== 'RUNNING') return []
    const ids: string[] = []
    for (let k = span.start; k < span.end && k < trace.length; k++) {
      if (trace[k].status === 'RUNNING') ids.push(trace[k].nodeId)
    }
    return ids
  }

  // 스냅샷 색상: 고정 결과 + 진행 중 컨트롤 + parallel frontier + 현재 노드 + reactive RUNNING leaf.
  private buildStatusById(
    trace: Visit[],
    spans: ControlSpan[],
    currentNodeId: string | null
  ): Record<string, ExecStatus> {
    const statusById: Record<string, ExecStatus> = { ...this.frozen }
    for (const span of spans) {
      if (this.cursor >= span.start && this.cursor < span.end) {
        statusById[span.nodeId] = 'RUNNING'
      }
    }
    // park 중이면 커서가 바깥 parallel 시작에 고정돼 위 조건으로 중첩 컨트롤을 못 잡는다.
    // 바깥 parallel 구간 안의 RUNNING 컨트롤(중첩 parallel 등)도 함께 RUNNING 으로 표시한다.
    if (this.parkedParallelId) {
      const parked = spans.find((s) => s.parallel && s.nodeId === this.parkedParallelId)
      if (parked) {
        for (const span of spans) {
          if (span.status === 'RUNNING' && span.start >= parked.start && span.end <= parked.end) {
            statusById[span.nodeId] = 'RUNNING'
          }
        }
      }
    }
    for (const id of this.parkedFrontierRunningIds(trace, spans)) {
      statusById[id] = 'RUNNING'
    }
    if (currentNodeId) statusById[currentNodeId] = 'RUNNING'
    if (this.runningLeafId) statusById[this.runningLeafId] = 'RUNNING'
    return statusById
  }

  // tick 뱃지: 이번 tick 에 RUNNING 인 노드(parallel 이면 frontier 전부, 아니면 현재 노드 하나)의
  // 연속 RUNNING tick 수를 누적하고, 빠진 노드는 제거한다.
  private updateRunningCounts(
    trace: Visit[],
    spans: ControlSpan[],
    currentNodeId: string | null
  ): Record<string, number> {
    const runningNow = this.parkedParallelId
      ? this.parkedFrontierRunningIds(trace, spans)
      : currentNodeId
        ? [currentNodeId]
        : []
    const counts: Record<string, number> = {}
    for (const id of runningNow) {
      counts[id] = (this.runningTicksById[id] ?? 0) + 1
    }
    this.runningTicksById = counts
    return counts
  }
}
