/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const forceSuccessNodeType = 'forceSuccess' as const
export const forceSuccessNodeName = 'forceSuccess' as const

export type BtForceSuccessNode = {
  kind: typeof forceSuccessNodeType
  name?: string
  attrs?: Record<string, string>
  child: BtAstNode
}
