import { isIfThenRuleMatch } from '../bt.util'
import { createBtActionNode } from '../mapping/createBtActionNode'
import type { BtRule } from './types'

export const rule_ifThen: BtRule = {
  name: 'ifThen',

  match: ({ outgoing }) => {
    return isIfThenRuleMatch(outgoing)
  },

  apply: ({ node, outgoing, buildAstList }) => {
    const self = createBtActionNode(node)

    const nextRef = outgoing.right
    if (!nextRef) {
      return [self]
    }

    const nextNodes = buildAstList(nextRef.targetId)

    return [self, ...nextNodes]
  }
}
;``
