/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const reactiveFallbackNodeType = 'reactiveFallback' as const
export const reactiveFallbackNodeName = 'reactiveFallback' as const

export type BtReactiveFallbackNode = {
  kind: typeof reactiveFallbackNodeType
  name: string
  attrs?: Record<string, string>
  children: BtAstNode[]
}
