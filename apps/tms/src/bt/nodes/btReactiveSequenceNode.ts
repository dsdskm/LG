/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const reactiveSequenceNodeType = 'reactiveSequence' as const
export const reactiveSequenceNodeName = 'reactiveSequence' as const

export type BtReactiveSequenceNode = {
  kind: typeof reactiveSequenceNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
