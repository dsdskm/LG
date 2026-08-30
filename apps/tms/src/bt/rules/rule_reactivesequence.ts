/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { BtAstNode } from '../types'
import {
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName,
  isReactiveSequenceRuleMatch
} from '../bt.util'
import type { BtRule } from './types'
import {
  BtReactiveSequenceNode,
  reactiveSequenceNodeName,
  reactiveSequenceNodeType
} from '../nodes/btReactiveSequenceNode'

export const rule_reactiveSequence: BtRule<typeof reactiveSequenceNodeName> = {
  name: reactiveSequenceNodeName,

  match: ({ node, outgoing }) => {
    return isReactiveSequenceRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const thenTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const branchChildren: BtAstNode[] = orderedBranchRefs.map((ref, idx) => {
      const astList = buildAstList(ref.targetId)

      return wrapAstListAsSequenceIfNeeded(astList, `reactive_sequence_branch_${idx + 1}`)
    })

    const reactiveSequenceNode: BtReactiveSequenceNode = {
      kind: reactiveSequenceNodeType,
      name: getRuleNodeName(node, 'reactive_sequence'),
      attrs: {
        node_id: String(node.id)
      },
      children: branchChildren
    }

    if (!thenTargetRef) {
      return [reactiveSequenceNode]
    }

    return [reactiveSequenceNode, ...buildAstList(thenTargetRef.targetId)]
  }
}
