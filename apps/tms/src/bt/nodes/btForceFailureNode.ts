/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const forceFailureNodeType = 'forceFailure' as const
export const forceFailureNodeName = 'forceFailure' as const

export type BtForceFailureNode = {
  kind: typeof forceFailureNodeType
  name?: string
  attrs?: Record<string, string>
  child: BtAstNode
}
