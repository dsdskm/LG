/**
 * Azure OpenAI tool-calling 루프.
 *
 * 주어진 tool 목록으로 LLM 이 함수를 호출하면 실행하고, 결과를 다시 넣어
 * 최종 자연어 답변이 나올 때까지 반복한다. data/action 인텐트 공용.
 */
import type {
  LlmClient,
  LlmMessage,
  LlmTool,
} from '../../llm/llm.types'
import type { ToolContext, ToolDefinition } from '../tool.type'
import type { ChatTurn } from '../pipeline.types'
import { safeJsonParse } from '../../utils/utils'

export type ExecutedCall = {
  name: string
  args: Record<string, any>
  result: unknown
  error?: string
}

export type AgentRunResult = {
  text: string
  executed: ExecutedCall[]
}

export type AgentLogger = {
  log: (msg: string) => void
  error: (msg: string) => void
}

/** ToolDefinition(선언) → 공통 LLM tool 스키마(OpenAI function 포맷). */
function toLlmTool(def: ToolDefinition): LlmTool {
  return {
    type: 'function',
    function: {
      name: def.declaration.name,
      description: def.declaration.description,
      parameters: def.declaration.parameters ?? { type: 'object', properties: {} },
    },
  }
}

export class ToolAgent {
  constructor(
    private readonly client: LlmClient,
    private readonly maxOutputTokens: number,
    private readonly maxToolTurns: number,
    private readonly logger: AgentLogger,
  ) {}

  /**
   * @param systemPrompt  역할/규칙 지시문
   * @param userMessage   사용자 발화
   * @param tools         사용 가능한 tool 목록
   * @param toolCtx       tool 실행 컨텍스트(자격증명/엔드포인트/화면 컨텍스트)
   */
  async run(
    systemPrompt: string,
    userMessage: string,
    tools: ToolDefinition[],
    toolCtx: ToolContext,
    history: ChatTurn[] = [],
  ): Promise<AgentRunResult> {
    const byName = new Map(tools.map((t) => [t.declaration.name, t]))
    const llmTools = tools.map(toLlmTool)

    // system → 이전 대화(문맥) → 현재 발화. 후속 발화의 참조 해소용.
    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user', content: userMessage },
    ]
    const executed: ExecutedCall[] = []

    for (let turn = 0; turn < this.maxToolTurns; turn++) {
      const res = await this.client.generateContent({
        messages,
        maxOutputTokens: this.maxOutputTokens,
        tools: llmTools,
        toolChoice: 'auto',
      })

      const toolCalls = res.toolCalls ?? []

      // tool 호출이 없으면 최종 답변
      if (toolCalls.length === 0) {
        return { text: (res.text ?? '').trim(), executed }
      }

      // assistant turn(tool_calls) 기록
      messages.push({
        role: 'assistant',
        content: res.text ?? null,
        tool_calls: toolCalls,
      })

      // 각 tool 실행 → tool 결과 메시지로 append
      for (const call of toolCalls) {
        const def = byName.get(call.function.name)
        const args = (safeJsonParse(call.function.arguments) ?? {}) as Record<string, any>

        let resultContent: string
        if (!def) {
          const error = `unknown tool: ${call.function.name}`
          executed.push({ name: call.function.name, args, result: null, error })
          resultContent = JSON.stringify({ error })
        } else {
          try {
            const result = await def.execute(args, toolCtx)
            executed.push({ name: call.function.name, args, result })
            resultContent = JSON.stringify(result ?? null)
          } catch (e: any) {
            const error = e?.message ?? String(e)
            this.logger.error(`[agent] tool ${call.function.name} failed: ${error}`)
            executed.push({ name: call.function.name, args, result: null, error })
            resultContent = JSON.stringify({ error })
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: resultContent,
        })
      }
    }

    // 반복 한도 초과: 실행 결과를 바탕으로 마지막 요약 1회
    this.logger.error(`[agent] maxToolTurns(${this.maxToolTurns}) 초과`)
    const res = await this.client.generateContent({
      messages,
      maxOutputTokens: this.maxOutputTokens,
    })
    return { text: (res.text ?? '').trim(), executed }
  }
}
