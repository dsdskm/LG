/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const retryUntilSuccessfulNodeType = 'retryUntilSuccessful' as const
export const retryUntilSuccessfulNodeName = 'retryUntilSuccessful' as const

// BT.CPP RetryUntilSuccessful: 자식이 실패하면 최대 numAttempts 회 재시도, 성공하면 성공.
export type BtRetryUntilSuccessfulNode = {
  kind: typeof retryUntilSuccessfulNodeType
  name: string
  numAttempts: number
  attrs: Record<string, string>
  child: BtAstNode
}
