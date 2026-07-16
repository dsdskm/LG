/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// 논리적 dead branch: 'if(true){a()}else{b()}' 의 b() 처럼, 조건 결과가 정적으로 확정돼
// 절대 실행될 수 없는 분기를 찾는다.
//
// 확정 근거 두 가지:
//  1) 노드 상수 신호  : 조건 노드 자체가 항상 SUCCESS/FAILURE (evaluateConstantOutcome)
import type { BtAstNode, BtIfThenElseNode } from '../../types'
import type { SemanticRule, ValidationIssue } from '../types'
import { collectBtNodeIds, getBtChildren } from '../astWalk'
import { evaluateConstantOutcome } from '../conditionOutcome'

type Outcome = 'SUCCESS' | 'FAILURE'

export const ruleDeadBranchLogic: SemanticRule = {
  id: 'dead-branch-logic',

  validate: ({ flow, model }): ValidationIssue[] => {
    const nodeById = new Map<string, any>()
    for (const node of flow.nodes ?? []) {
      nodeById.set(String(node.id), node)
    }

    const deadIds = new Set<string>()
    const reasons: string[] = []

    const conditionIdOf = (ite: BtIfThenElseNode): string | null => {
      const id = (ite.children?.[0] as any)?.attrs?.node_id
      return id ? String(id) : null
    }
    const conditionLabel = (id: string | null): string => {
      const node = id ? nodeById.get(id) : null
      return String(node?.data?.label ?? node?.data?.taskName ?? id ?? 'condition')
    }
    const markDead = (subtree: BtAstNode | undefined, reason: string) => {
      if (!subtree) return
      const ids = collectBtNodeIds(subtree)
      if (ids.size === 0) return
      ids.forEach((id) => deadIds.add(id))
      reasons.push(reason)
    }

    const walk = (node: BtAstNode, known: Map<string, Outcome>) => {
      if (node.kind === 'ifThenElse') {
        const condId = conditionIdOf(node)
        const condNode = condId ? nodeById.get(condId) : null
        const [, thenCase, elseCase] = node.children

        // 상위에서 확정된 결과(구조적) 우선, 없으면 노드 상수 신호
        const determined: Outcome | null =
          (condId ? known.get(condId) : null) ?? (condNode ? evaluateConstantOutcome(condNode) : null)

        if (determined === 'SUCCESS') {
          markDead(elseCase, `조건 "${conditionLabel(condId)}" 이(가) 항상 성공이라 else 분기는 실행되지 않습니다`)
          walk(thenCase, condId ? new Map(known).set(condId, 'SUCCESS') : known)
        } else if (determined === 'FAILURE') {
          markDead(thenCase, `조건 "${conditionLabel(condId)}" 이(가) 항상 실패라 then 분기는 실행되지 않습니다`)
          walk(elseCase, condId ? new Map(known).set(condId, 'FAILURE') : known)
        } else {
          // 미확정: 각 분기에 이 조건의 결과를 가정하고 내려가 하위의 모순을 탐지
          walk(thenCase, condId ? new Map(known).set(condId, 'SUCCESS') : known)
          walk(elseCase, condId ? new Map(known).set(condId, 'FAILURE') : known)
        }
        return
      }

      for (const child of getBtChildren(node)) {
        walk(child, known)
      }
    }

    walk(model, new Map())

    if (deadIds.size === 0) return []
    return [
      {
        ruleId: 'dead-branch-logic',
        severity: 'error',
        message: reasons.join('\n'),
        nodeIds: [...deadIds]
      }
    ]
  }
}
