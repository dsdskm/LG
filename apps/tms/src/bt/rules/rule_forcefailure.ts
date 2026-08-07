/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// ForceFailure 컨트롤(데코레이터) → BtForceFailureNode (BT.CPP ForceFailure).
// leftBranches 를 자식으로 받고(여러 개면 sequence 로 감쌈), right 는 다음 흐름으로 이어붙인다.

import type { BtAstNode } from '../types'
import { BtForceFailureNode, forceFailureNodeName, forceFailureNodeType } from '../nodes/btForceFailureNode'
import { isForceFailureRuleMatch, sortOutgoingEdgeRefsByCanvasPosition, getRuleNodeName } from '../bt.util'
import type { BtRule } from './types'

export const rule_forceFailure: BtRule<typeof forceFailureNodeName> = {
  name: forceFailureNodeName,

  match: ({ node, outgoing }) => {
    return isForceFailureRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    // 데코레이터라 자식(leftBranch)이 반드시 있어야 한다. (right=다음 흐름은 허용)
    if (candidateTargetRefs.length === 0) {
      throw new Error(`ForceFailure 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }
    if (candidateTargetRefs.length > 1) {
      throw new Error(`ForceFailure 노드는 자식이 1개만 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)
    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const body: BtAstNode =
      children.length === 1 ? children[0] : { kind: 'sequence', name: 'force_failure_body', children }

    const forceNode: BtForceFailureNode = {
      kind: forceFailureNodeType,
      name: getRuleNodeName(node, 'force_failure'),
      attrs: { node_id: String(node.id) },
      child: body
    }

    if (!nextTargetRef) {
      return [forceNode]
    }

    return [forceNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
