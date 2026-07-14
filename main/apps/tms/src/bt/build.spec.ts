/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import normalTaskDefinition from './__fixtures__/test-taskflow-normal.json'
import invalidRoot2TwoNode from './__fixtures__/test-taskflow-root-2-2node.json'
import invalidUnreachable from './__fixtures__/test-taskflow-unreachable.json'
import { buildBehaviorTreeFromFlowDefinition } from './build'

describe('buildBehaviorTreeFromFlowDefinition', () => {
  it('연결되지 않은 node가 있는 경우', () => {
    expect(() => buildBehaviorTreeFromFlowDefinition(invalidUnreachable)).toThrow()
  })

  it('정상의 경우', () => {
    const { model } = buildBehaviorTreeFromFlowDefinition(normalTaskDefinition)

    expect(normalTaskDefinition.id).toBeDefined()
    expect(normalTaskDefinition.name).toBeDefined()
    expect(normalTaskDefinition.status).toBe('ACTIVE')
  })

  it('root에서 2개 node로 out이 있는 경우', () => {
    expect(() => buildBehaviorTreeFromFlowDefinition(invalidRoot2TwoNode)).toThrow()
  })
})
