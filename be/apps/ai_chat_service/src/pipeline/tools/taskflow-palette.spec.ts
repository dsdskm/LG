import {
  describeTaskProperties,
  findContentRef,
  findGraphNodes,
  parseNodeTarget,
  readCurrentGraphFromContext,
  readTaskContentsFromContext,
  resolveProperties,
} from './taskflow-palette'

const contents = [
  { taskId: 29, taskName: 'MoveTo', contentName: '도슨트 대기(D1)', contentId: 101 },
  { taskId: 29, taskName: 'MoveTo', contentName: '도슨트 안내(D2)', contentId: 102 },
  { taskId: 31, taskName: 'PlaySound', contentName: '이동', contentId: 201 },
  { taskId: 30, taskName: 'PlayFace', contentName: 'Joy', contentId: 301 },
]

describe('findContentRef', () => {
  it('resolves a partial name to the palette content ("도슨트 대기" -> "도슨트 대기(D1)")', () => {
    expect(findContentRef('도슨트 대기', '', contents)?.contentId).toBe(101)
  })

  it('prefers the closest name when several contents share a prefix', () => {
    expect(findContentRef('도슨트 안내', '', contents)?.contentId).toBe(102)
  })

  it('ignores spacing differences', () => {
    expect(findContentRef('도슨트대기', '', contents)?.contentId).toBe(101)
  })

  it('scopes to the requested task when given', () => {
    expect(findContentRef('이동', 'PlaySound', contents)?.contentId).toBe(201)
  })

  it('returns nothing for a name that is not in the palette', () => {
    expect(findContentRef('없는 이름', '', contents)).toBeUndefined()
  })
})

// rule 테이블에 넣는 값과 같은 모양. 코드에는 기본값을 두지 않는다.
const ordinalRules = {
  ordinalWords: { 첫: 1, 두: 2, 세: 3 },
  ordinalSuffixPhrases: ['번째', '번쨰', '째'],
  nounPhrases: ['노드', 'node'],
}

describe('canvas context parsing', () => {
  const context = {
    taskflow: {
      taskContents: contents,
      currentGraph: {
        nodes: [
          { id: 'n1', label: 'Joy', taskName: 'PlayFace', contentName: 'Joy', ordinal: 1 },
          { id: 'n2', label: 'Joy', taskName: 'PlayFace', contentName: 'Joy', ordinal: 2 },
        ],
        edges: [{ source: 'n1', target: 'n2', branch: true }],
      },
    },
  }

  it('reads palette contents and the current graph the front sent', () => {
    expect(readTaskContentsFromContext(context)).toHaveLength(4)
    expect(readCurrentGraphFromContext(context).nodes.map((node) => node.id)).toEqual(['n1', 'n2'])
    expect(readCurrentGraphFromContext(context).edges[0].branch).toBe(true)
  })

  it('treats a missing taskflow context as an empty palette', () => {
    expect(readTaskContentsFromContext({})).toEqual([])
    expect(readCurrentGraphFromContext(undefined)).toEqual({ nodes: [], edges: [] })
  })

  it('picks the numbered node when the user says "Joy #2"', () => {
    const graph = readCurrentGraphFromContext(context)
    expect(parseNodeTarget('Joy #2')).toMatchObject({ name: 'Joy', ordinal: 2 })
    expect(findGraphNodes('Joy #2', graph).map((node) => node.id)).toEqual(['n2'])
    expect(findGraphNodes('Joy', graph)).toHaveLength(2)
  })

  it('reads spelled-out ordinals with the configured rule words', () => {
    const graph = readCurrentGraphFromContext(context)
    expect(parseNodeTarget('두번째 Joy', ordinalRules)).toMatchObject({ name: 'Joy', ordinal: 2 })
    expect(parseNodeTarget('두 번째 Joy 노드', ordinalRules)).toMatchObject({ name: 'Joy', ordinal: 2 })
    expect(parseNodeTarget('2번째 Joy', ordinalRules)).toMatchObject({ name: 'Joy', ordinal: 2 })
    expect(parseNodeTarget('Joy 두번쨰', ordinalRules)).toMatchObject({ name: 'Joy', ordinal: 2 })
    expect(parseNodeTarget('Joy', ordinalRules)).toMatchObject({ name: 'Joy', ordinal: null })
    expect(findGraphNodes('두번째 Joy', graph, ordinalRules).map((node) => node.id)).toEqual(['n2'])
  })

  it('keeps the "#N" only behaviour when the rules are empty', () => {
    expect(parseNodeTarget('두번째 Joy')).toMatchObject({ name: '두번째 Joy', ordinal: null })
  })

  it('falls back to screen order when the front sent no ordinal badge', () => {
    const graph = readCurrentGraphFromContext({
      taskflow: {
        currentGraph: {
          nodes: [
            { id: 'n1', label: 'Love', taskName: 'PlayFace', contentName: 'Love' },
            { id: 'n2', label: 'Love', taskName: 'PlayFace', contentName: 'Love' },
          ],
          edges: [],
        },
      },
    })
    expect(findGraphNodes('두번째 Love', graph, ordinalRules).map((node) => node.id)).toEqual(['n2'])
  })
})

describe('task properties', () => {
  // property_tms.compose_hint 에 담아 둔 모양 그대로.
  const repeat = {
    taskId: 25,
    taskName: 'Repeat',
    taskType: 'CONTROL',
    roleSummary: '',
    triggerPhrases: [],
    contentType: '',
    composeHint: { intent: 'repeat', properties: { num_cycles: { type: 'number', description: '반복 횟수' } } },
  }
  const delay = {
    ...repeat,
    taskId: 28,
    taskName: 'Delay',
    composeHint: { intent: 'delay', properties: { delay_msec: { type: 'number', description: '지연 시간(ms)' } } },
  }

  it('keeps only schema keys and casts numbers', () => {
    expect(resolveProperties(repeat, { num_cycles: '3' })).toEqual({ properties: { num_cycles: 3 }, unknownKeys: [] })
    expect(resolveProperties(delay, { delay_msec: '3000' })).toEqual({
      properties: { delay_msec: 3000 },
      unknownKeys: [],
    })
  })

  it('reports keys that are not in the schema', () => {
    expect(resolveProperties(repeat, { num_cycle: 3 })).toEqual({ properties: {}, unknownKeys: ['num_cycle'] })
    expect(resolveProperties(undefined, { num_cycles: 3 })).toEqual({ properties: {}, unknownKeys: ['num_cycles'] })
  })

  it('lists the schema for the tool description', () => {
    expect(describeTaskProperties([delay, repeat])).toBe(
      ['- Delay: delay_msec:number(지연 시간(ms))', '- Repeat: num_cycles:number(반복 횟수)'].join('\n'),
    )
  })
})
