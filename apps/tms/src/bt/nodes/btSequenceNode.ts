/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const sequenceNodeType = 'sequence' as const
export const sequenceNodeName = 'sequence' as const

export type BtSequenceNode = {
  kind: typeof sequenceNodeType
  name: string
  children: BtAstNode[]
}
