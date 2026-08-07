/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { BtAstNode } from '../types'

export const btPreconditionNodeType = 'btPrecondition' as const
export const btPreconditionNodeName = 'btPrecondition' as const

// BT.CPP Precondition 의 포트명(속성 키). 문자열 하드코딩 대신 여기서 정의해 재사용한다.
export const preconditionIfProp = 'if' as const
export const preconditionElseProp = 'else' as const

// else 미지정 시 기본값(BT.CPP 기본과 동일).
export const preconditionElseDefault = 'FAILURE' as const

export type BtPreconditionNode = {
  kind: typeof btPreconditionNodeType
  name?: string
  attrs?: Record<string, string>
  child: BtAstNode
}
