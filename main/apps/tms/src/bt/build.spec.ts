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

import and_valid from './__fixtures__/node/and/valid.json'
import and_noLeftChild from './__fixtures__/node/and/no-left-child.json'

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

  // And: 왼쪽 자식으로 연결된 노드부터 오른쪽으로 이어진 노드들이 자식이 되고, XML 은 Sequence 로 나간다.
  it('And:valid', () => {
    const { xml, warnings } = buildBehaviorTreeFromFlowDefinition(and_valid)

    const andStart = xml.indexOf('<Sequence name="and_And">')
    const andEnd = xml.indexOf('</Sequence>', andStart)

    expect(warnings.length).toEqual(0)
    expect(andStart).toBeGreaterThan(-1)
    expect(xml.indexOf('<Action ID="SetInterrupt"')).toBeGreaterThan(andStart)
    expect(xml.indexOf('<Action ID="ScriptCondition"')).toBeLessThan(andEnd)
  })

  // And 는 컨트롤 노드라, 자식 없이 오른쪽만 연결되면 Action 으로 생성하지 않고 에러여야 한다.
  it('And:no-left-child', () => {
    expect(() => buildBehaviorTreeFromFlowDefinition(and_noLeftChild)).toThrow(
      /And 노드는 왼쪽으로 자식이 연결되어 있어야 합니다/
    )
  })
})
