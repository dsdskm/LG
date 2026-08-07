/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const orNodeType = 'or' as const
export const orNodeName = 'or' as const

export type BtOrNode = {
  kind: typeof orNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
