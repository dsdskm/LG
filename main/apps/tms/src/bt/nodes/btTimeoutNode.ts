/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const btTimeoutNodeType = 'timeout' as const
export const btTimeoutNodeName = 'timeout' as const

export type BtTimeoutNode = {
  kind: typeof btTimeoutNodeType
  attrs: Record<string, string>
  child: BtAstNode
}
