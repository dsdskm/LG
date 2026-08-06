import { matchAiLogEventRule } from './event-rule-first'

describe('matchAiLogEventRule', () => {
  it('matches today issue query', async () => {
    const matched = await matchAiLogEventRule({
      routeKey: 'robot/ailog/event',
      message: '오늘 이슈 보여줘',
      phraseMatch: null,
    })

    expect(matched).toBeTruthy()
    expect(matched?.type).toBe('today-issue')
    expect(matched?.toolArgs.period).toBe('today')
  })

  it('matches yesterday issue query', async () => {
    const matched = await matchAiLogEventRule({
      routeKey: 'robot/ailog/event',
      message: '어제 이벤트 보여줘',
      phraseMatch: null,
    })

    expect(matched).toBeTruthy()
    expect(matched?.type).toBe('yesterday-issue')
    expect(matched?.toolArgs.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(matched?.toolArgs.end).toBe(matched?.toolArgs.start)
  })

  it('matches date range issue query', async () => {
    const matched = await matchAiLogEventRule({
      routeKey: 'robot/ailog/event',
      message: '8월 1일부터 8월 3일까지의 이슈 보여줘',
      phraseMatch: null,
    })

    expect(matched).toBeTruthy()
    expect(matched?.type).toBe('range-issue')
    expect(matched?.toolArgs.start).toMatch(/^\d{4}-08-01$/)
    expect(matched?.toolArgs.end).toMatch(/^\d{4}-08-03$/)
  })

  it('matches function issue query', async () => {
    const matched = await matchAiLogEventRule({
      routeKey: 'robot/ailog/event',
      message: '주행 기능 이슈 보여줘',
      phraseMatch: null,
    })

    expect(matched).toBeTruthy()
    expect(matched?.type).toBe('function-issue')
    expect(matched?.toolArgs.func).toBe('주행')
  })

  it('returns null for non-issue text', async () => {
    const matched = await matchAiLogEventRule({
      routeKey: 'robot/ailog/event',
      message: '안녕하세요',
      phraseMatch: null,
    })

    expect(matched).toBeNull()
  })
})
