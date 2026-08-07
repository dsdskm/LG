/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const reactiveOrNodeType = 'reactiveOr' as const
export const reactiveOrNodeName = 'reactiveOr' as const

export type BtReactiveOrNode = {
  kind: typeof reactiveOrNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
