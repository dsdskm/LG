/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const parallelNodeType = 'parallel' as const
export const parallelNodeName = 'parallel' as const

export const parallelMainNodesProp = 'main_nodes' as const

export const parallelSuccessCountProp = 'success_count' as const
export const parallelFailureCountProp = 'failure_count' as const

export type BtParallelNode = {
  kind: typeof parallelNodeType
  name: string
  successCount: number
  failureCount: number
  attrs: Record<string, string>
  children: BtAstNode[]
}
