/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const fallbackNodeType = 'fallback' as const
export const fallbackNodeName = 'fallback' as const

export type BtFallbackNode = {
  kind: typeof fallbackNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
