/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const btDelayNodeType = 'delay' as const
export const btDelayNodeName = 'delay' as const

export type BtDelayNode = {
  kind: typeof btDelayNodeType
  attrs: Record<string, string>
  child: BtAstNode
}
