/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { BtAstNode } from '../types'
import {
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName,
  isReactiveAndRuleMatch
} from '../bt.util'
import type { BtRule } from './types'
import { BtReactiveAndNode, reactiveAndNodeName, reactiveAndNodeType } from '../nodes/btReactiveAndNode'

export const rule_reactiveAnd: BtRule<typeof reactiveAndNodeName> = {
  name: reactiveAndNodeName,

  match: ({ node, outgoing }) => {
    return isReactiveAndRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const thenTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const branchChildren: BtAstNode[] = orderedBranchRefs.map((ref, idx) => {
      const astList = buildAstList(ref.targetId)

      return wrapAstListAsSequenceIfNeeded(astList, `reactive_and_branch_${idx + 1}`)
    })

    const reactiveAndNode: BtReactiveAndNode = {
      kind: reactiveAndNodeType,
      name: getRuleNodeName(node, 'reactive_and'),
      attrs: {
        node_id: String(node.id)
      },
      children: branchChildren
    }

    if (!thenTargetRef) {
      return [reactiveAndNode]
    }

    return [reactiveAndNode, ...buildAstList(thenTargetRef.targetId)]
  }
}
