/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const ifThenElseNodeType = 'ifThenElse' as const
export const ifThenElseNodeName = 'ifThenElse' as const

export type BtIfThenElseNode = {
  kind: typeof ifThenElseNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
