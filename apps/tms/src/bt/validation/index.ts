/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// Semantic Validation 진입점.
//
// build(Static Validation 포함)로 만든 AST(model)에 대해 등록된 규칙들을 실행하고
// 이슈 목록을 반환한다. 새 검증을 추가하려면 rules/ 에 규칙을 만들어 rules/index.ts 에 등록.

import type { SemanticContext, ValidationIssue } from './types'
import { semanticRules } from './rules'

export * from './types'

export function validateSemantics(ctx: SemanticContext): ValidationIssue[] {
  return semanticRules.flatMap((rule) => rule.validate(ctx))
}
