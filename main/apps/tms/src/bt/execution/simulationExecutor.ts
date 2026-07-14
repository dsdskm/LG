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

import { buildSimTrace, type ResolveFn } from './simulate'
import type { ExecSnapshot, ExecStatus, FlowExecutor } from './executor'
import { EMPTY_SNAPSHOT } from './executor'

export class SimulationExecutor implements FlowExecutor {
  readonly kind = 'simulation' as const

  private cursor = -1
  private frozen: Record<string, ExecStatus> = {}
  private snapshot: ExecSnapshot = EMPTY_SNAPSHOT

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
  }

  getSnapshot(): ExecSnapshot {
    return this.snapshot
  }

  async step(): Promise<ExecSnapshot> {
    // 현재 설정 기준으로 실행 순서(trace)와 컨트롤 구간(spans)을 계산.
    // (미실행 구간은 최신 설정을 반영, 이미 지난 구간은 아래 freeze 로 보존)
    const { trace, spans } = buildSimTrace(this.flowDefinition, this.startNodeId, this.resolve)

    if (this.cursor < 0) {
      // 미시작 → 첫 노드로
      this.cursor = trace.length > 0 ? 0 : -1
    } else {
      const cur = trace[this.cursor]
      // RUNNING 으로 강제된 노드는 완료되지 않고 그 자리에 머문다.
      if (!(cur && cur.status === 'RUNNING')) {
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

    this.snapshot = { statusById, currentNodeId, finished }
    return this.snapshot
  }
}
