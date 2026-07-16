/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// Dead branch: START 에서 절대 도달할 수 없는 노드 검출.
//
// build 는 START 부터 도달 가능한 노드만 AST 에 넣으므로, flow 에는 있는데 AST 에는 없는
// 노드 = 도달 불가(dead). (edge 가 아예 없는 고립 노드는 build 의 Static Validation 에서
// 이미 걸러지므로, 여기서는 edge 는 있으나 START 와 연결되지 않은 노드를 잡는다.)

import type { SemanticRule, ValidationIssue } from '../types'
import { collectBtNodeIds } from '../astWalk'

function nodeLabel(node: any): string {
  return String(node?.data?.label ?? node?.data?.taskName ?? node?.data?.name ?? node?.id)
}

export const ruleDeadBranch: SemanticRule = {
  id: 'dead-branch',

  validate: ({ flow, model, startNodeId }): ValidationIssue[] => {
    const reached = collectBtNodeIds(model)

    const dead = (flow.nodes ?? []).filter((node: any) => {
      const id = String(node.id)
      // START(ROOT) 는 AST 에 별도 노드로 없으므로 제외
      if (id === String(startNodeId)) return false
      if (String(node?.data?.taskType ?? '').toUpperCase() === 'ROOT') return false
      return !reached.has(id)
    })

    if (dead.length === 0) return []

    return [
      {
        ruleId: 'dead-branch',
        severity: 'error',
        message: `START 에서 도달할 수 없는 노드가 있습니다: ${dead.map(nodeLabel).join(', ')}`,
        nodeIds: dead.map((node: any) => String(node.id))
      }
    ]
  }
}
