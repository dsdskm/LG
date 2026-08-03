import type { BtAstNode } from '../types'
import { repeatNodeType, BtRepeatNode, repeatNodeName } from '../nodes/btRepeatNode'
import {
  isRepeatRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  getNodeNumberPropertyValue,
  getRuleNodeName
} from '../bt.util'
import type { BtRule } from './types'
import { sequenceNodeType } from '../nodes/btSequenceNode'

export const rule_repeat: BtRule<typeof repeatNodeName> = {
  name: repeatNodeName,

  match: ({ node, outgoing }) => {
    return isRepeatRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const repeatChildren: BtAstNode[] = orderedBranchRefs.flatMap((ref) => {
      return buildAstList(ref.targetId)
    })

    const repeatBody: BtAstNode =
      repeatChildren.length === 1
        ? repeatChildren[0]
        : {
            kind: sequenceNodeType,
            name: 'repeat_body',
            children: repeatChildren
          }

    const repeatNode: BtRepeatNode = {
      kind: repeatNodeType,
      name: getRuleNodeName(node, 'repeat'),
      numCycles: resolveNumCycles(node),
      attrs: {
        node_id: String(node.id)
      },
      child: repeatBody
    }

    if (!nextTargetRef) {
      return [repeatNode]
    }

    return [repeatNode, ...buildAstList(nextTargetRef.targetId)]
  }
}

function resolveNumCycles(node: any): number {
  const value = getNodeNumberPropertyValue(node, 1, 'num_cycles', 'numCycles', 'repeat_count', 'repeatCount')

  return value > 0 ? value : 1
}
;``
