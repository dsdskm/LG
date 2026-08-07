import type { BtAstNode } from '../types'
import { repeatNodeType, BtRepeatNode, repeatNodeName, repeatNumCyclesProp } from '../nodes/btRepeatNode'
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

    if (candidateTargetRefs.length === 0) {
      throw new Error(`Repeat 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }
    if (candidateTargetRefs.length > 1) {
      throw new Error(`Repeat 노드는 자식이 1개만 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const repeatChildren: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const repeatBody: BtAstNode = {
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
  const value = getNodeNumberPropertyValue(node, 1, repeatNumCyclesProp)

  // BT.CPP 규칙: -1 은 무한 반복.
  if (value === -1) return -1

  return value > 0 ? value : 1
}
;
