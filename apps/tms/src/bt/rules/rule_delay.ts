/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import type { BtAstNode } from '../types'
import { btDelayNodeName, btDelayNodeType, type BtDelayNode } from '../nodes/btDelayNode'
import { sequenceNodeType } from '../nodes/btSequenceNode'
import { isDelayRuleMatch, sortOutgoingEdgeRefsByCanvasPosition } from '../bt.util'
import type { BtRule } from './types'

export const rule_delay: BtRule<typeof btDelayNodeName> = {
  name: btDelayNodeName,

  match: ({ node, outgoing }) => {
    return isDelayRuleMatch(node, outgoing)
  },

  apply: ({ node, outgoing, nodeById, buildAstList }) => {
    const candidateTargetRefs = outgoing.leftBranches ?? []
    const nextTargetRef = outgoing.right

    if (candidateTargetRefs.length === 0) {
      throw new Error(`Delay 노드는 자식이 있어야 합니다. (node_id=${String(node.id)})`)
    }
    if (candidateTargetRefs.length > 1) {
      throw new Error(`Delay 노드는 자식이 1개만 있어야 합니다. (node_id=${String(node.id)})`)
    }

    const orderedBranchRefs = sortOutgoingEdgeRefsByCanvasPosition(candidateTargetRefs, nodeById)
    const children: BtAstNode[] = orderedBranchRefs.flatMap((ref) => buildAstList(ref.targetId))

    const body: BtAstNode =
      children.length === 1 ? children[0] : { kind: sequenceNodeType, name: 'delay_body', children }

    const properties = (node.data?.properties ?? {}) as Record<string, unknown>
    const attrs: Record<string, string> = {
      node_id: String(node.id)
    }

    const delayMsec = properties.delay_msec
    if (delayMsec != null && String(delayMsec) !== '') {
      attrs.delay_msec = String(delayMsec)
    }

    const delayNode: BtDelayNode = {
      kind: btDelayNodeType,
      attrs,
      child: body
    }

    if (!nextTargetRef) {
      return [delayNode]
    }

    return [delayNode, ...buildAstList(nextTargetRef.targetId)]
  }
}
