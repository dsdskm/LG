import { inferMoveStepsFromMessage, parseMoveStopsFromMessage } from './taskflow-move-parser.util'

describe('taskflow move parser', () => {
  it('parses arrow route with trailing move phrase', () => {
    const stops = parseMoveStopsFromMessage('위치2->위치1로 이동하는 태스크플로우 구성해줘')
    expect(stops).toEqual(['위치2', '위치1'])
  })

  it('parses multi-stop arrow route', () => {
    const stops = parseMoveStopsFromMessage('충전 스테이션1->회의실A->리셉션 태스크플로우 구성해줘')
    expect(stops).toEqual(['충전 스테이션1', '회의실A', '리셉션'])
  })

  it('parses from-to sentence', () => {
    const stops = parseMoveStopsFromMessage('위치2에서 위치1로 이동하는 태스크플로우 구성해줘')
    expect(stops).toEqual(['위치2', '위치1'])
  })

  it('parses sequential move targets', () => {
    const stops = parseMoveStopsFromMessage('회의실A로 가서 리셉션으로 이동하는 태스크플로우 구성해줘')
    expect(stops).toEqual(['회의실A', '리셉션'])
  })

  it('parses from-base route with additional stop', () => {
    const stops = parseMoveStopsFromMessage('위치1에서 위치2로 갔다가 위치3 이동 태스크 플로우 만들어줘')
    expect(stops).toEqual(['위치1', '위치2', '위치3'])
  })

  it('parses long arrow chain route', () => {
    const stops = parseMoveStopsFromMessage('위치1->위치2->위치3->위치4 이동 태스크 플로우 만들어줘')
    expect(stops).toEqual(['위치1', '위치2', '위치3', '위치4'])
  })

  it('parses simple from-to move phrase', () => {
    const stops = parseMoveStopsFromMessage('위치1에서 위치2로 가는 이동 태스크 플로우 만들어줘')
    expect(stops).toEqual(['위치1', '위치2'])
  })

  it('builds MoveTo steps', () => {
    const steps = inferMoveStepsFromMessage('A->B로 이동해줘')
    expect(steps).toEqual([
      { label: 'A', taskName: 'MoveTo', contentName: 'A' },
      { label: 'B', taskName: 'MoveTo', contentName: 'B' },
    ])
  })
})
