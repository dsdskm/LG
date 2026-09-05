import type { ToolContext, ToolDefinition } from '../tool.type'
import { describeGraph, describeGraphNode, readCurrentGraph } from './taskflow-palette'

const TOOL_NAME = 'read_taskflow_graph'

export function createReadTaskflowGraphTool(): ToolDefinition {
  return {
    readOnly: true,
    declaration: {
      name: TOOL_NAME,
      description: [
        '현재 캔버스에 놓여 있는 TaskFlow 구조를 읽는다.',
        '기존 노드를 추가/교체/삭제하기 전에 먼저 호출해 실제 노드 이름을 확인한다.',
        '플로우를 평가하거나 개선을 제안할 때도 먼저 호출한다.',
        '이름이 겹치는 노드에는 " #번호" 가 붙어 나온다. 이 번호는 사용자 화면의 노드 배지와 같은 값이므로 지목할 때 그대로 쓴다.',
      ].join('\n'),
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
