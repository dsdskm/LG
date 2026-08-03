/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

export const actionNodeType = 'action' as const
export const actionNodeName = 'action' as const

export type BtActionNode = {
  kind: typeof actionNodeType
  tag: string
  name: string
  attrs: Record<string, string>
}
