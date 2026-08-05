/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const andNodeType = 'and' as const
export const andNodeName = 'and' as const

export type BtAndNode = {
  kind: typeof andNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
