import type { ToolContext, ToolDefinition } from '../tool.type'
import { CHAT_PROMPT_TYPE } from '../../features/chat/prompt-types'
import { renderPromptTemplate } from '../prompt-template.util'
import { describeGraph, describeGraphNode, readCurrentGraph } from './taskflow-palette'
import { TASKFLOW_CANVAS_SCREEN_KEY } from './taskflow-message'

const TOOL_NAME = 'read_taskflow_graph'

// 설명은 prompt 테이블에서 온다. 행이 없으면 tool 을 등록하지 않아 설정 누락이 드러나게 한다.
export function createReadTaskflowGraphTool(): ToolDefinition | null {
  const description = renderPromptTemplate(TASKFLOW_CANVAS_SCREEN_KEY, CHAT_PROMPT_TYPE.toolReadTaskflowGraph)
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
