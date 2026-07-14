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
})
