import type { ToolContext, ToolDefinition } from '../tool.type'
import { describeGraph, describeGraphNode, readCurrentGraph } from './taskflow-palette'
import { taskflowMessage, TASKFLOW_MESSAGE_KEY } from './taskflow-message'

const TOOL_NAME = 'read_taskflow_graph'

// 설명은 prompt 테이블에서 온다. 행이 없으면 tool 을 등록하지 않아 설정 누락이 드러나게 한다.
export function createReadTaskflowGraphTool(): ToolDefinition | null {
  const description = taskflowMessage(TASKFLOW_MESSAGE_KEY.toolReadGraph)
  if (!description) return null

  return {
    readOnly: true,
    declaration: {
      name: TOOL_NAME,
      description,
      parameters: { type: 'object', properties: {} },
    },

    execute: async (_args: Record<string, any>, ctx: ToolContext) => {
      const graph = readCurrentGraph(ctx)
      ctx.log?.log(`[${TOOL_NAME}] nodes=${graph.nodes.length} edges=${graph.edges.length}`)

      return {
        nodeNames: graph.nodes.map(describeGraphNode),
        graphText: describeGraph(graph),
      }
    },
  }
}
