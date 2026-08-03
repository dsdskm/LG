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

  apply: ({ node, outgoing, outgoingById, nodeById, buildAstList }) => {
    const conditionTargetRefs = sortOutgoingEdgeRefsByCanvasPosition(outgoing.leftBranches ?? [], nodeById)

    if (conditionTargetRefs.length === 0) {
      throw new Error(`IfThenElse 노드에 condition task가 연결되어 있지 않습니다. (node_id=${String(node.id)})`)
    }

    if (conditionTargetRefs.length > 1) {
      throw new Error(`IfThenElse 노드는 condition task를 1개만 가져야 합니다. (node_id=${String(node.id)})`)
    }

    const conditionTargetRef = conditionTargetRefs[0]
    const conditionNodeId = conditionTargetRef.targetId
    const conditionNode = nodeById.get(conditionNodeId)

    if (!conditionNode) {
      throw new Error(`IfThenElse의 condition 노드를 찾을 수 없습니다. (condition_node_id=${String(conditionNodeId)})`)
    }

    const conditionOutgoing = outgoingById.get(conditionNodeId) ?? { leftBranches: [] }

    const thenTargetRef = conditionOutgoing.right
    const elseTargetRef = conditionOutgoing.bottom
    const nextTargetRef = outgoing.right

    if (!thenTargetRef) {
      throw new Error(`Condition Task의 성공(then) 경로가 없습니다. (condition_node_id=${String(conditionNodeId)})`)
    }

    if (!elseTargetRef) {
      throw new Error(`Condition Task의 실패(else) 경로가 없습니다. (condition_node_id=${String(conditionNodeId)})`)
    }

    const conditionAction = createBtActionNode(conditionNode)

    const trueChildren: BtAstNode[] = nextTargetRef
      ? [...buildAstList(thenTargetRef.targetId), ...buildAstList(nextTargetRef.targetId)]
      : [...buildAstList(thenTargetRef.targetId)]

    const falseChildren: BtAstNode[] = buildAstList(elseTargetRef.targetId)

    const ifThenElseNode: BtIfThenElseNode = {
      kind: ifThenElseNodeType,
      name: getRuleNodeName(node, 'ifthenelse'),
      attrs: {
        node_id: String(node.id)
      },
      children: [
        conditionAction,
        wrapAstListAsSequenceIfNeeded(trueChildren, 'true_case'),
        wrapAstListAsSequenceIfNeeded(falseChildren, 'false_case')
      ]
    }

    return [ifThenElseNode]
  }
}
