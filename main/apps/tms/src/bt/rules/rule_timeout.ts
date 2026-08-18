/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { BtAstNode } from '../types'
import { btTimeoutNodeName, btTimeoutNodeType, type BtTimeoutNode } from '../nodes/btTimeoutNode'
import { sequenceNodeType } from '../nodes/btSequenceNode'
import { isTimeoutRuleMatch, sortOutgoingEdgeRefsByCanvasPosition } from '../bt.util'
import type { BtRule } from './types'

export const rule_timeout: BtRule<typeof btTimeoutNodeName> = {
  name: btTimeoutNodeName,

  match: ({ node, outgoing }) => {
    return isTimeoutRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    if (candidateTargetRefs.length === 0) {
      throw new Error(`Timeout 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)
    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const body: BtAstNode = {
      kind: sequenceNodeType,
      name: 'timeout_body',
      children
    }

    const properties = (node.data?.properties ?? {}) as Record<string, unknown>
    const attrs: Record<string, string> = {
      node_id: String(node.id)
    }

    const timeoutMsec = properties.msec ?? properties.timeout_msec ?? properties.timeoutMsec
    if (timeoutMsec != null && String(timeoutMsec) !== '') {
      attrs.msec = String(timeoutMsec)
    }

    const timeoutNode: BtTimeoutNode = {
      kind: btTimeoutNodeType,
      attrs,
      child: body
    }

    if (!nextTargetRef) {
      return [timeoutNode]
    }

    return [timeoutNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
