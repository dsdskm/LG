import type { BtAstNode } from '../types'
import { BtIfThenElseNode, ifThenElseNodeName, ifThenElseNodeType } from '../nodes/btIfThenElseNode'
import {
  isIfThenElseRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  wrapAstListAsSequenceIfNeeded,
  getRuleNodeName
} from '../bt.util'
import { createBtActionNode } from '../mapping/createBtActionNode'
import type { BtRule } from './types'

export const rule_ifThenElse: BtRule<typeof ifThenElseNodeName> = {
  name: ifThenElseNodeName,

  match: ({ node, outgoing }) => {
    return isIfThenElseRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(outgoing.leftBranches ?? [], nodeById)

    if (orderedBranchRefs.length < 2) {
      throw new Error(`IfThenElse 노드는 condition + success 조합이 최소 2개 필요합니다. (node_id=${String(node.id)})`)
    }

    if (orderedBranchRefs.length > 3) {
      throw new Error(`IfThenElse 노드는 condition + success + failure 최대 3개까지만 연결할 수 있습니다. (node_id=${String(node.id)})`)
    }

    const conditionRef = orderedBranchRefs[0]
    const successRef = orderedBranchRefs[1]
    const failureRef = orderedBranchRefs[2]

    const nextTargetRef = outgoing.right

    const conditionChildren = buildAstList(conditionRef.targetId)
    const successChildren = buildAstList(successRef.targetId)
    const failureChildren = failureRef ? buildAstList(failureRef.targetId) : []

    const ifThenElseNode: BtIfThenElseNode = {
      kind: ifThenElseNodeType,
      name: getRuleNodeName(node, 'ifthenelse'),
      attrs: {
        node_id: String(node.id)
      },
      children: [
        wrapAstListAsSequenceIfNeeded(conditionChildren, 'condition_case'),
        wrapAstListAsSequenceIfNeeded(successChildren, 'success_case'),
        ...(failureRef ? [wrapAstListAsSequenceIfNeeded(failureChildren, 'failure_case')] : [])
      ]
    }

    if (!nextTargetRef) {
      return [ifThenElseNode]
    }

    return [ifThenElseNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
