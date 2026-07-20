/*
 * SPDX-FileCopyrightText: Copyright 2026 LG Electronics Inc.
 * SPDX-License-Identifier: LicenseRef-LGE-Proprietary
 */

import { DEFAULT_NODE_CONFIG, NodeSimConfig } from '@/pages/TaskFlowCanvasPage/FlowCanvasViewer/NodeInspectDialog'
import normalTaskDefinition from '../__fixtures__/test-taskflow-normal.json'
import { SimStatus } from './simulate'
import { SimulationExecutor } from './simulationExecutor'

describe('SimulationExecutor', () => {
  it('normal', () => {
    const nodeConfigs: Record<string, NodeSimConfig> = {}

    const resolveResult = (nodeId: string): SimStatus => {
      const forced = nodeConfigs[nodeId]?.forced ?? DEFAULT_NODE_CONFIG.forced
      if (forced === 'FAILURE') return 'FAILURE'
      if (forced === 'RUNNING') return 'RUNNING'
      return 'SUCCESS'
    }
    const startNodeId = 'start'
    const simulationExecutor = new SimulationExecutor(normalTaskDefinition, startNodeId, resolveResult)
    simulationExecutor.step()
    simulationExecutor.step()
    simulationExecutor.step()
    simulationExecutor.step()

    expect(simulationExecutor.kind).toBe('simulation')
    expect(normalTaskDefinition.status).toBe('ACTIVE')
  })
})
