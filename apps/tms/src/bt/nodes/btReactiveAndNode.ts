/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const reactiveAndNodeType = 'reactiveAnd' as const
export const reactiveAndNodeName = 'reactiveAnd' as const

export type BtReactiveAndNode = {
  kind: typeof reactiveAndNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
