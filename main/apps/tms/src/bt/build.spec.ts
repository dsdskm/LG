/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { buildBehaviorTreeFromFlowDefinition } from './build'

import normalTaskDefinition from './__fixtures__/test-taskflow-normal.json'
import invalidRoot2TwoNode from './__fixtures__/test-taskflow-root-2-2node.json'
import invalidUnreachable from './__fixtures__/test-taskflow-unreachable.json'

import forceSuccess_valid from './__fixtures__/node/force-success/valid.json'
import forceSuccess_haveTwoLeft from './__fixtures__/node/force-success/have-two-left.json'

import forceFailure_valid from './__fixtures__/node/force-failure/valid.json'
import forceFailure_haveTwoLeft from './__fixtures__/node/force-failure/have-two-left.json'

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

  it('ForceSuccess:valid', () => {
    const { model, xml, warnings } = buildBehaviorTreeFromFlowDefinition(forceSuccess_valid)
    expect(warnings.length).toEqual(0)
  })

  it('ForceSuccess:have-two-left', () => {
    expect(() => buildBehaviorTreeFromFlowDefinition(forceSuccess_haveTwoLeft)).toThrow()
  })
  it('ForceFailure:valid', () => {
    const { model, xml, warnings } = buildBehaviorTreeFromFlowDefinition(forceFailure_valid)
    expect(warnings.length).toEqual(0)
  })

  it('ForceFailure:have-two-left', () => {
    expect(() => buildBehaviorTreeFromFlowDefinition(forceFailure_haveTwoLeft)).toThrow()
  })
})
