/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// FlowExecutor 의 "실제 로봇" 구현 (뼈대/TODO).
//
// 시뮬레이터와 동일한 FlowExecutor 인터페이스를 구현하므로, FE 는 이 구현체로 교체만 하면
// 실제 디바이스를 붙인 step 디버깅이 된다. 실제 연동(명령 전송/결과 수신)은 아래 TODO 위치에
// deviceControlApis / MQTT 구독 등을 연결하면 된다.
//
// 동작 개요:
//   reset() : 로봇에 대상 taskflow 를 준비/초기화시키고 tick 인덱스를 0 으로.
//   step()  : 로봇에 "1 tick 실행" 을 요청하고, 로봇이 보고한 노드 상태(NodeStatus[])가
//             올 때까지 기다렸다가 스냅샷으로 변환해 반환.
//
// 로봇 상태 보고는 이미 프로젝트에 타입이 있다(@/types/api/device 의 NodeStatus, activePath).
// RUNNING_STATUS 뷰가 쓰는 것과 동일한 데이터를 여기서 스냅샷으로 매핑한다.

import type { ExecSnapshot, ExecStatus, FlowExecutor } from './executor'
import { EMPTY_SNAPSHOT } from './executor'
import type { NodeStatus } from '@/types/api/device'

export type DeviceExecutorOptions = {
  deviceId: string
  taskFlowId: number
  // 로봇에 1 tick 실행을 요청하고, 그 결과 노드 상태 목록을 반환하는 함수.
  //  - 폴링 방식: API 로 tick 명령 → 응답으로 상태
  //  - 스트리밍 방식: MQTT 로 tick 명령 → 다음 상태 메시지 대기
  requestTick: (ctx: { deviceId: string; taskFlowId: number; tickIndex: number }) => Promise<{
    nodes: NodeStatus[]
    finished: boolean
  }>
  // 로봇에 taskflow 를 준비/리셋시키는 함수(선택)
  prepare?: (ctx: { deviceId: string; taskFlowId: number }) => Promise<void>
}

// 로봇이 보고한 status 문자열을 FE 표시용 상태로 정규화한다.
function normalizeStatus(raw: string): ExecStatus | null {
  const s = String(raw ?? '').toUpperCase()
  if (s === 'RUNNING') return 'RUNNING'
  if (s === 'SUCCESS') return 'SUCCESS'
  if (s === 'FAILURE' || s === 'FAILED' || s === 'FAIL') return 'FAILURE'
  return null // IDLE 등은 map 에서 생략(대기)
}

export function nodeStatusesToSnapshot(nodes: NodeStatus[], finished: boolean): ExecSnapshot {
  const statusById: Record<string, ExecStatus> = {}
  const runningCountById: Record<string, number> = {}
  let currentNodeId: string | null = null
  for (const n of nodes) {
    const st = normalizeStatus(n.status)
    if (!st) continue
    statusById[n.nodeId] = st
    if (typeof n.runningCount === 'number') runningCountById[n.nodeId] = n.runningCount
    if (st === 'RUNNING') currentNodeId = n.nodeId
  }
  return { statusById, currentNodeId, finished, runningCountById }
}

export class DeviceExecutor implements FlowExecutor {
  readonly kind = 'device' as const

  private tickIndex = 0
  private snapshot: ExecSnapshot = EMPTY_SNAPSHOT
  private prepared = false

  constructor(private readonly options: DeviceExecutorOptions) {}

  reset(): void {
    this.tickIndex = 0
    this.prepared = false
    this.snapshot = EMPTY_SNAPSHOT
  }

  getSnapshot(): ExecSnapshot {
    return this.snapshot
  }

  async step(): Promise<ExecSnapshot> {
    const { deviceId, taskFlowId } = this.options

    // 첫 step 전에 로봇에 taskflow 준비/리셋
    if (!this.prepared) {
      await this.options.prepare?.({ deviceId, taskFlowId })
      this.prepared = true
    }

    // 로봇에 1 tick 실행을 요청하고 결과(노드 상태)를 기다린다.
    const { nodes, finished } = await this.options.requestTick({
      deviceId,
      taskFlowId,
      tickIndex: this.tickIndex
    })
    this.tickIndex += 1

    this.snapshot = nodeStatusesToSnapshot(nodes, finished)
    return this.snapshot
  }

  dispose(): void {
    // TODO: MQTT 구독 해제 등 정리
  }
}
