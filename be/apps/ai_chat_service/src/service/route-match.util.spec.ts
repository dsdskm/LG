import { getHeuristicFallbackCandidates, matchRouteTemplate, normalizeRoutePath } from './route-match.util'

describe('matchRouteTemplate', () => {
  it('파라미터 자리는 어떤 값이든 같은 화면으로 본다', () => {
    expect(matchRouteTemplate('tms/taskflows/:taskFlowId/canvas', 'tms/taskflows/12/canvas')).toBe(true)
    expect(matchRouteTemplate('tms/taskflows/:taskFlowId/canvas', '/tms/taskflows/12/canvas')).toBe(true)
  })

  it('세그먼트 수나 고정 이름이 다르면 다른 화면이다', () => {
    expect(matchRouteTemplate('tms/taskflows/:taskFlowId/canvas', 'tms/taskflows/12')).toBe(false)
    expect(matchRouteTemplate('tms/taskflows/:taskFlowId/canvas', 'tms/robots/12/canvas')).toBe(false)
    expect(matchRouteTemplate('', 'tms')).toBe(false)
  })
})

describe('normalizeRoutePath', () => {
  it('앞쪽 슬래시와 공백을 지운다', () => {
    expect(normalizeRoutePath('  /tms/robots ')).toBe('tms/robots')
    expect(normalizeRoutePath(undefined)).toBe('')
  })
})

describe('getHeuristicFallbackCandidates', () => {
  it('앱별로 되짚어 볼 화면을 돌려준다', () => {
    expect(getHeuristicFallbackCandidates('robot/ailog/event/detail')).toEqual([
      'robot/ailog/event',
      'robot/ailog',
      'robot/dashboard',
    ])
    expect(getHeuristicFallbackCandidates('tms/taskflows/1/canvas')).toEqual(['tms'])
    expect(getHeuristicFallbackCandidates('unknown/page')).toEqual([])
  })
})
