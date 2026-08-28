/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { BtAstNode } from '../types'
import { fallbackNodeName, fallbackNodeType, type BtFallbackNode } from '../nodes/btFallbackNode'
import {
  isFallbackRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName
} from '../bt.util'
import type { BtRule } from './types'

export const rule_fallback: BtRule<typeof fallbackNodeName> = {
  name: fallbackNodeName,

  match: ({ node, outgoing }) => {
    return isFallbackRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const thenTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const branchChildren: BtAstNode[] = orderedBranchRefs.map((ref, idx) => {
      const astList = buildAstList(ref.targetId)

      return wrapAstListAsSequenceIfNeeded(astList, `fallback_branch_${idx + 1}`)
    })

    const fallbackNode: BtFallbackNode = {
      kind: fallbackNodeType,
      name: getRuleNodeName(node, 'fallback'),
      attrs: {
        node_id: String(node.id)
      },
      children: branchChildren
    }

    if (!thenTargetRef) {
      return [fallbackNode]
    }

    return [fallbackNode, ...buildAstList(thenTargetRef.targetId)]
  }
}
