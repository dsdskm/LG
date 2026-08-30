/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

export const fallbackOnFailureNodeType = 'fallbackOnFailure' as const
export const fallbackOnFailureNodeName = 'fallbackOnFailure' as const

import { BtAstNode } from '../types'

export type BtFallbackOnFailureNode = {
  kind: typeof fallbackOnFailureNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
