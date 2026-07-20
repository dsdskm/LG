/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// Semantic Validation 타입.
//
// buildBehaviorTreeFromFlowDefinition() 가 Static Validation(cycle/edge 오류 등)을 통과해
// AST(model)를 만든 뒤, 그 AST 를 기준으로 수행하는 의미 검증의 공용 타입이다.
// 규칙(SemanticRule)을 배열로 등록해 두고 validateSemantics() 가 순서대로 실행한다.

import type { BtSequenceNode } from '../types'

export type ValidationSeverity = 'error' | 'warning'

export type ValidationIssue = {
  ruleId: string
  severity: ValidationSeverity
  message: string
  // 관련 노드 id (캔버스 하이라이트 등 후속 활용용)
  nodeIds?: string[]
}

export type SemanticContext = {
  // 정규화된 flowDefinition (START 노드 포함)
  flow: { nodes?: any[]; edges?: any[] }
  // build 결과 AST (root_sequence)
  model: BtSequenceNode
  // START(ROOT) 노드 id
  startNodeId: string | null
}

export type SemanticRule = {
  id: string
  validate: (ctx: SemanticContext) => ValidationIssue[]
}
