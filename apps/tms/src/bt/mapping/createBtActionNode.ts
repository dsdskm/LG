import type { Node } from '@xyflow/react'
import type { BtActionNode } from '../nodes/btActionNode'
import { resolveBtCppNodeInfo } from './resolveBtCppNodeInfo'

export function createBtActionNode(node: Node): BtActionNode {
  const { tag, nameAttr, attrs } = resolveBtCppNodeInfo(node)

  return {
    kind: 'action',
    tag,
    name: nameAttr,
    attrs: {
      ...attrs,
      node_id: String(node.id)
    }
  }
}
