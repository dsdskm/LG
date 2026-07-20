import type { BtAstNode, BtOrNode } from '../types'
import {
  isIfElseRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName
} from '../bt.util'
import type { BtRule } from './types'

export const rule_ifElse: BtRule = {
  name: 'ifElse',

  match: ({ node, outgoing }) => {
    return isIfElseRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const thenTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const branchChildren: BtAstNode[] = orderedBranchRefs.map((ref, idx) => {
      const astList = buildAstList(ref.targetId)

      return wrapAstListAsSequenceIfNeeded(astList, `or_branch_${idx + 1}`)
    })

    const orNode: BtOrNode = {
      kind: 'or',
      name: getRuleNodeName(node, 'or'),
      attrs: {
        node_id: String(node.id)
      },
      children: branchChildren
    }

    if (!thenTargetRef) {
      return [orNode]
    }

    return [orNode, ...buildAstList(thenTargetRef.targetId)]
  }
}
