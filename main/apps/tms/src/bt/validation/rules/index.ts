/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { SemanticRule } from '../types'
import { ruleDeadBranch } from './ruleDeadBranch'
import { ruleDeadBranchLogic } from './ruleDeadBranchLogic'

// 등록된 semantic 규칙들. 규칙을 추가하려면 여기에 넣기만 하면 된다.
//  - dead-branch       : 그래프상 START 에서 도달 불가한 노드(별도 컴포넌트 등)
//  - dead-branch-logic : 조건 결과가 정적으로 확정돼 논리적으로 실행 불가한 분기
export const semanticRules: SemanticRule[] = [ruleDeadBranch, ruleDeadBranchLogic]
