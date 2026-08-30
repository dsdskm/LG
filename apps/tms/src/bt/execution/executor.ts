/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// Flow 실행기(Executor) 추상화.
//
// FE(디버깅 화면)는 "시뮬레이터"인지 "실제 로봇"인지 몰라도 되도록, 오직 이 인터페이스로만
// 실행을 제어한다. 매 tick 마다 step() 을 호출하고, 돌아온 스냅샷(노드별 상태)을 렌더링한다.
//   - 시뮬레이터: step() 이 즉시 계산해서 반환
//   - 실제 로봇 : step() 이 로봇에 tick 을 요청하고 결과가 올 때까지 await
//
// 이 seam 덕분에 FE 루프(auto/manual, pause/resume, breakpoint, 렌더링)는 그대로 두고
// Executor 구현체만 교체하면 실제 디바이스 디버깅으로 확장된다.

import type { SimStatus } from './simulate'

// 노드 상태. (IDLE 은 map 에서 '없음'으로 표현하므로 SimStatus 3종만 사용)
export type ExecStatus = SimStatus

// 소스(시뮬/로봇) 무관하게 FE 가 렌더링에 쓰는 실행 스냅샷
export type ExecSnapshot = {
  // 노드 id → 상태. 실행이 끝난 노드의 결과는 고정된다(다시 바뀌지 않음). 없으면 대기(IDLE).
  statusById: Record<string, ExecStatus>
  // 지금 실행 중(RUNNING)인 노드 id (없으면 null)
  currentNodeId: string | null
  // 전체 실행 종료 여부
  finished: boolean
  // 노드 id → 현재 tick 반복 횟수. 같은 노드가 계속 RUNNING(예: 강제 RUNNING)이면 매 tick 증가한다.
  // → 화면상 변화가 없는 RUNNING 노드에 "다음 tick에 다시 실행됨"을 숫자로 보여주는 데 쓴다.
  runningCountById: Record<string, number>
}

export const EMPTY_SNAPSHOT: ExecSnapshot = {
  statusById: {},
  currentNodeId: null,
  finished: false,
  runningCountById: {}
}

export interface FlowExecutor {
  readonly kind: 'simulation' | 'device'

  // 처음부터 다시 시작할 수 있도록 내부 실행 상태를 초기화
  reset(): void

  // 한 tick 실행하고 그 시점의 스냅샷을 반환.
  // (device 구현은 로봇에 tick 을 보내고 결과를 기다렸다가 반환)
  step(): Promise<ExecSnapshot>

  // 마지막으로 계산된 스냅샷
  getSnapshot(): ExecSnapshot

  // 리소스 정리(구독 해제 등). device 구현에서 의미 있음.
  dispose?(): void
}
