/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// ReactiveFallback 컨트롤 → BtReactiveFallbackNode (BT.CPP ReactiveFallback).
// Fallback 과 동일하게 leftBranches 를 분기 자식으로 갖고, right 는 다음 흐름으로 이어붙인다.

import type { BtAstNode } from '../types'
import {
  reactiveFallbackNodeType,
  BtReactiveFallbackNode,
  reactiveFallbackNodeName
} from '../nodes/btReactiveFallbackNode'
import {
  isReactiveFallbackRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName
} from '../bt.util'
import type { BtRule } from './types'

export const rule_reactiveFallback: BtRule<typeof reactiveFallbackNodeName> = {
  name: reactiveFallbackNodeName,

  match: ({ node, outgoing }) => {
    return isReactiveFallbackRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const thenTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const branchChildren: BtAstNode[] = orderedBranchRefs.map((ref, idx) => {
      const astList = buildAstList(ref.targetId)

      return wrapAstListAsSequenceIfNeeded(astList, `reactive_fallback_branch_${idx + 1}`)
    })

    const reactiveFallbackNode: BtReactiveFallbackNode = {
      kind: reactiveFallbackNodeType,
      name: getRuleNodeName(node, 'reactive_fallback'),
      attrs: {
        node_id: String(node.id)
      },
      children: branchChildren
    }

    if (!thenTargetRef) {
      return [reactiveFallbackNode]
    }

    return [reactiveFallbackNode, ...buildAstList(thenTargetRef.targetId)]
  }
}
