import { ChatOrchestrator } from './chat.orchestrator'

describe('ChatOrchestrator taskflow routing guard', () => {
  const client = {
    generateContent: async () => ({ text: '' }),
  } as any

  const pipeline = {
    ragTopK: 3,
    maxToolTurns: 3,
    actionRunnerUrl: '',
    intentMinConfidence: 0.5,
  } as any

  it('does not treat a Parallel usage question as a taskflow edit request', () => {
    const orchestrator = new ChatOrchestrator(client, 1024, pipeline, { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any)

    expect((orchestrator as any).looksLikeTaskflowEditMessage('Parallel 노드는 어떻게 써?')).toBe(false)
    expect((orchestrator as any).looksLikeTaskflowEditMessage('Parallel 노드 구성해줘')).toBe(true)
  })

  it('retries with common action tools before falling back', async () => {
    const orchestrator = new ChatOrchestrator(client, 1024, pipeline, { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any)

    const run = jest.fn(async (_systemPrompt: string, _message: string, tools: Array<{ declaration: { name: string } }>) => {
      const toolNames = tools.map((tool) => tool.declaration.name)
      if (toolNames.includes('common-tool')) {
        return {
          text: '',
          executed: [
            {
              name: 'common-tool',
              args: {},
              result: {
                chat_action_param: {
                  via: 'common',
                  assistantText: '공통 action 성공',
                },
              },
            },
          ],
        }
      }

      return {
        text: '',
        executed: [
          {
            name: 'primary-tool',
            args: {},
            error: 'primary tool failed',
          },
        ],
      }
    })

    ;(orchestrator as any).agent = { run }

    const result = await (orchestrator as any).handleExecution(
      {
        key: 'robot/test',
        appKey: 'robot',
        screenName: '테스트 화면',
        ragCollection: 'robot/test',
        dataTools: [],
        actionTools: [
          {
            declaration: { name: 'primary-tool' },
            execute: async () => ({}),
          },
        ],
        commonActionTools: [
          {
            declaration: { name: 'common-tool' },
            execute: async () => ({}),
          },
        ],
        dataSystemPrompt: '',
        actionSystemPrompt: '',
        chatActions: { info: 'info', data: 'data', action: 'action' },
        fallbackText: 'fallback text',
      },
      '질문',
      { context: {}, body: { reqId: 'req-1' } } as any,
      {},
      [],
      'unknown',
      undefined,
      ['robot/test'],
      'req-1',
    )

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.reply?.text).toContain('공통 action 성공')
    expect(result.meta).toMatchObject({ actionAttemptSource: 'common' })
  })

  it('returns the screen fallback prompt when action intent has no tools', async () => {
    const orchestrator = new ChatOrchestrator(client, 1024, pipeline, { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any)

    const result = await (orchestrator as any).handleExecution(
      {
        key: 'robot/test',
        appKey: 'robot',
        screenName: '테스트 화면',
        ragCollection: 'robot/test',
        dataTools: [],
        actionTools: [],
        commonActionTools: [],
        dataSystemPrompt: '',
        actionSystemPrompt: '',
        chatActions: { info: 'info', data: 'data', action: 'action' },
        fallbackText: '화면별 가이드 문구',
        guidanceExamples: ['첫 번째 요청', '두 번째 요청'],
      },
      '처리해줘',
      { context: {}, body: { reqId: 'req-2' } } as any,
      {},
      [],
      'unknown',
      undefined,
      ['robot/test'],
      'req-2',
    )

    expect(result.reply).toEqual({
      chat_action: 'action',
      text: '아래처럼 요청해보세요.\n첫 번째 요청\n두 번째 요청',
    })
    expect(result.meta).toMatchObject({ pipelineIntent: 'action', executed: [], fallbackTextUsed: true })
  })

  it('ignores free-form agent text when no action tool was executed', async () => {
    const orchestrator = new ChatOrchestrator(client, 1024, pipeline, { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any)
    ;(orchestrator as any).agent = {
      run: jest.fn(async () => ({ text: 'LLM이 임의로 만든 성공 응답', executed: [] })),
    }

    const result = await (orchestrator as any).handleExecution(
      {
        key: 'robot/test',
        appKey: 'robot',
        screenName: '테스트 화면',
        ragCollection: 'robot/test',
        dataTools: [],
        actionTools: [{ declaration: { name: 'screen-tool' }, execute: async () => ({}) }],
        commonActionTools: [],
        dataSystemPrompt: '',
        actionSystemPrompt: '',
        chatActions: { info: 'info', data: 'data', action: 'action' },
        fallbackText: '화면별 가이드 문구',
        guidanceExamples: ['첫 번째 요청', '두 번째 요청'],
      },
      '처리해줘',
      { context: {}, body: { reqId: 'req-3' } } as any,
      {},
      [],
      'unknown',
      undefined,
      ['robot/test'],
      'req-3',
    )

    expect(result.reply?.text).toBe('아래처럼 요청해보세요.\n첫 번째 요청\n두 번째 요청')
    expect(result.meta).toMatchObject({ pipelineIntent: 'action', fallbackTextUsed: true })
  })
})
