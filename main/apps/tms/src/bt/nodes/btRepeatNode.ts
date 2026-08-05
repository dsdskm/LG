/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const repeatNodeType = 'repeat' as const
export const repeatNodeName = 'repeat' as const

export const repeatNumCyclesProp = 'num_cycles' as const

export type BtRepeatNode = {
  kind: typeof repeatNodeType
  name: string
  numCycles: number
  attrs: Record<string, string>
  child: BtAstNode
}
