/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// RetryUntilSuccessful 컨트롤(데코레이터) → BtRetryUntilSuccessfulNode (BT.CPP RetryUntilSuccessful).
// leftBranch 로 자식 1개를 받고(여러 개면 sequence 로 감쌈), right 는 다음 흐름으로 이어붙인다.

import type { BtAstNode } from '../types'
import {
  BtRetryUntilSuccessfulNode,
  retryUntilSuccessfulNodeType,
  retryUntilSuccessfulNodeName
} from '../nodes/btRetryUntilSuccessfulNode'
import { sequenceNodeType } from '../nodes/btSequenceNode'
import {
  isRetryUntilSuccessfulRuleMatch,
  sortOutgoingEdgeRefsByCanvasPosition,
  getNodeNumberPropertyValue,
  getRuleNodeName
} from '../bt.util'
import type { BtRule } from './types'

export const rule_retryUntilSuccessful: BtRule<typeof retryUntilSuccessfulNodeName> = {
  name: retryUntilSuccessfulNodeName,

  match: ({ node, outgoing }) => {
    return isRetryUntilSuccessfulRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    // 데코레이터라 자식(leftBranch)이 정확히 1개 있어야 한다. (right=다음 흐름은 허용)
    if (candidateTargetRefs.length === 0) {
      throw new Error(`RetryUntilSuccessful 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }
    if (candidateTargetRefs.length > 1) {
      throw new Error(`RetryUntilSuccessful 노드는 자식이 1개만 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)
    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const body: BtAstNode =
      children.length === 1 ? children[0] : { kind: sequenceNodeType, name: 'retry_body', children }

    const retryNode: BtRetryUntilSuccessfulNode = {
      kind: retryUntilSuccessfulNodeType,
      name: getRuleNodeName(node, 'retry_until_successful'),
      numAttempts: resolveNumAttempts(node),
      attrs: { node_id: String(node.id) },
      child: body
    }

    if (!nextTargetRef) {
      return [retryNode]
    }

    return [retryNode, ...buildAstList(nextTargetRef.targetId)]
  }
}

function resolveNumAttempts(node: any): number {
  const value = getNodeNumberPropertyValue(node, 1, 'num_attempts', 'numAttempts')

  return value > 0 ? value : 1
}
