/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// Precondition 컨트롤(데코레이터) → BtPreconditionNode (BT.CPP Precondition).
// leftBranch 로 자식 1개를 받고, right 는 다음 흐름으로 이어붙인다.
// if(조건 스크립트)/else(조건 거짓 시 반환 상태) 는 속성에서 읽어 attrs 로 실어 XML 로 내보낸다.

import type { BtAstNode } from '../types'
import {
  BtPreconditionNode,
  btPreconditionNodeType,
  btPreconditionNodeName,
  preconditionIfProp,
  preconditionElseProp,
  preconditionElseDefault
} from '../nodes/btPreconditionNode'
import { sequenceNodeType } from '../nodes/btSequenceNode'
import { isPreconditionRuleMatch, sortOutgoingEdgeRefsByCanvasPosition, getRuleNodeName } from '../bt.util'
import type { BtRule } from './types'

export const rule_precondition: BtRule<typeof btPreconditionNodeName> = {
  name: btPreconditionNodeName,

  match: ({ node, outgoing }) => {
    return isPreconditionRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    // 데코레이터라 자식(leftBranch)이 정확히 1개 있어야 한다. (right=다음 흐름은 허용)
    if (candidateTargetRefs.length === 0) {
      throw new Error(`Precondition 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }
    if (candidateTargetRefs.length > 1) {
      throw new Error(`Precondition 노드는 자식이 1개만 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)
    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const body: BtAstNode =
      children.length === 1 ? children[0] : { kind: sequenceNodeType, name: 'precondition_body', children }

    // 노드 형태상 속성은 node.data.properties 에 있으므로 직접 읽는다.
    const properties = (node.data?.properties ?? {}) as Record<string, unknown>

    const attrs: Record<string, string> = { node_id: String(node.id) }
    const ifExpr = properties[preconditionIfProp]
    if (ifExpr != null && String(ifExpr) !== '') {
      attrs[preconditionIfProp] = String(ifExpr)
    }
    const elseStatus = properties[preconditionElseProp]
    attrs[preconditionElseProp] =
      elseStatus != null && String(elseStatus) !== '' ? String(elseStatus) : preconditionElseDefault

    const preconditionNode: BtPreconditionNode = {
      kind: btPreconditionNodeType,
      name: getRuleNodeName(node, 'precondition'),
      attrs,
      child: body
    }

    if (!nextTargetRef) {
      return [preconditionNode]
    }

    return [preconditionNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
