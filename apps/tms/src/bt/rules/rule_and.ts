/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// And 컨트롤 → BtAndNode (XML: <Sequence>, BT.CPP 에 And 태그가 없어 Sequence 로 내보낸다).
// leftBranch 로 연결된 일반 노드에서 오른쪽으로 이어진 흐름을 그대로 자식 목록으로 펼친다.
//   (예) And -left-> Task1 -right-> Task2  ⇒  <Sequence><Action Task1/><Action Task2/></Sequence>
// or(Fallback) 처럼 분기를 sequence 로 감싸지 않는다. And 자체가 순차 실행이라 감쌀 필요가 없다.
// right 는 And 다음 흐름으로 이어붙인다.
// 컨트롤 노드이므로 And 노드에는 항상 이 규칙이 매칭되고, 자식이 없으면 Action 으로 생성하지 않고 에러로 막는다.

import type { BtAstNode } from '../types'
import { andNodeName, andNodeType, type BtAndNode } from '../nodes/btAndNode'
import {
  isAndRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  getRuleNodeName,
  getNodeDisplayName
} from '../bt.util'
import type { BtRule } from './types'

export const rule_and: BtRule<typeof andNodeName> = {
  name: andNodeName,

  match: ({ node, outgoing }) => {
    return isAndRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    // 컨트롤 노드라 자식(leftBranch)이 반드시 있어야 한다. (right=다음 흐름은 허용)
    // 자식 없이 right 만 연결하면 Action 으로 생성되므로 여기서 명확히 막는다.
    if (candidateTargetRefs.length === 0) {
      throw new Error(
        `And 노드는 왼쪽으로 자식이 연결되어 있어야 합니다. (${getNodeDisplayName(node)})`
      )
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)

    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const andNode: BtAndNode = {
      kind: andNodeType,
      name: getRuleNodeName(node, 'and'),
      attrs: {
        node_id: String(node.id)
      },
      children
    }

    if (!nextTargetRef) {
      return [andNode]
    }

    return [andNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
