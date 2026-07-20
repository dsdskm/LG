/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

// always success/failure 류의 node가 있을때를 확인한다.

export type ConstOutcome = 'SUCCESS' | 'FAILURE' | null

export function evaluateConstantOutcome(node: any): ConstOutcome {
  const data = node?.data ?? {}
  const props = data.properties ?? {}

  // taskName/taskType 이 always 류인 경우
  const name = String(data.taskName ?? '').toUpperCase()
  if (name === 'ALWAYSSUCCESS') return 'SUCCESS'
  if (name === 'ALWAYSFAILURE') return 'FAILURE'

  return null
}
