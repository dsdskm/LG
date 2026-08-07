/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { DEFAULT_NODE_CONFIG, NodeSimConfig } from '@/pages/TaskFlowCanvasPage/FlowCanvasViewer/NodeInspectDialog'
import normalTaskDefinition from '../__fixtures__/test-taskflow-normal.json'
import { buildSimTrace, SimStatus } from './simulate'

describe('buildSimTrace', () => {
  it('정상의 경우', () => {
    const nodeConfigs: Record<string, NodeSimConfig> = {}

    const resolveResult = (nodeId: string): SimStatus => {
      const forced = nodeConfigs[nodeId]?.forced ?? DEFAULT_NODE_CONFIG.forced
      if (forced === 'FAILURE') return 'FAILURE'
      if (forced === 'RUNNING') return 'RUNNING'
      return 'SUCCESS'
    }
    const startNodeId = 'start'
    const { trace, spans, model, error } = buildSimTrace(normalTaskDefinition, startNodeId, resolveResult)

    expect(normalTaskDefinition.id).toBeDefined()
    expect(normalTaskDefinition.name).toBeDefined()
    expect(normalTaskDefinition.status).toBe('ACTIVE')
  })

  it('Repeat num_cycles=-1 은 SUCCESS 누적 시 RUNNING 으로 유지된다', () => {
    const definition = {
      nodes: [
        {
          id: 'start',
          type: 'startNode',
          position: { x: 0, y: 0 },
          data: { label: 'START' }
        },
        {
          id: 'repeat-1',
          type: 'taskNode',
          position: { x: 180, y: 0 },
          data: {
            label: 'Repeat',
            taskName: 'Repeat',
            taskType: 'CONTROL',
            properties: {
              num_cycles: -1
            }
          }
        },
        {
          id: 'child-1',
          type: 'taskNode',
          position: { x: 360, y: 0 },
          data: {
            label: 'Tts',
            taskName: 'Tts',
            taskType: 'ACTION'
          }
        }
      ],
      edges: [
        {
          id: 'e-start-repeat',
          source: 'start',
          target: 'repeat-1',
          sourceHandle: 'right',
          targetHandle: 'left'
        },
        {
          id: 'e-repeat-child-1',
          source: 'repeat-1',
          target: 'child-1',
          sourceHandle: 'left',
          targetHandle: 'left'
        }
      ]
    }

    const { trace, spans, error } = buildSimTrace(definition as any, 'start', () => 'SUCCESS')

    expect(error).toBeNull()
    expect(trace.filter((v) => v.nodeId === 'child-1').length).toBe(1)
    const repeatSpan = spans.find((s) => s.nodeId === 'repeat-1')
    expect(repeatSpan?.status).toBe('RUNNING')
  })
})
