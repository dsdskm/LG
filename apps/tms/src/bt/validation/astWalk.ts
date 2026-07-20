/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// BtAst 순회 유틸. semantic 규칙들이 공용으로 사용한다.

import type { BtAstNode } from '../types'

export function getBtChildren(node: BtAstNode): BtAstNode[] {
  switch (node.kind) {
    case 'sequence':
    case 'ifThenElse':
    case 'or':
    case 'fallbackOnFailure':
    case 'parallel':
      return node.children ?? []
    case 'repeat':
    case 'forceSuccess':
      return node.child ? [node.child] : []
    default:
      return []
  }
}

// AST 안에 등장하는 모든 노드의 node_id(원본 flow 노드 id) 집합.
// 구조용 노드(sequence 등, node_id 없음)는 제외된다.
export function collectBtNodeIds(root: BtAstNode): Set<string> {
  const ids = new Set<string>()
  const stack: BtAstNode[] = [root]

  while (stack.length > 0) {
    const node = stack.pop() as BtAstNode
    const id = (node as any).attrs?.node_id
    if (id) ids.add(String(id))
    for (const child of getBtChildren(node)) stack.push(child)
  }

  return ids
}
