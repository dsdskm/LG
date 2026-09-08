import {
  isBranchEdge,
  isChildAppendInsert,
  normalizeAssistantDraft,
  pickFallbackAnchor,
  type AssistantDraftPayload
} from './assistantDraft'

describe('normalizeAssistantDraft', () => {
  it('hangs concurrent actions under the control node as branch inserts', () => {
    // "도슨트 대기로 이동하면서, 이동 음악 재생하고, Joy 얼굴 표시되게 해줘"
    const normalized = normalizeAssistantDraft<AssistantDraftPayload>({
      mode: 'replace',
      roots: [
        {
          taskName: 'Parallel',
          taskType: 'CONTROL',
          children: [
            { taskName: 'MoveTo', taskType: 'ACTION', contentName: '도슨트 대기', contentId: 101, children: [] },
            { taskName: 'PlaySound', taskType: 'ACTION', contentName: '이동 음악', contentId: 201, children: [] },
            { taskName: 'PlayFace', taskType: 'ACTION', contentName: 'Joy', contentId: 301, children: [] }
          ]
        }
      ]
    })

    expect(normalized?.mode).toBe('edit')
    expect(normalized?.insertAfter).toHaveLength(4)

    const [control, ...children] = normalized?.insertAfter ?? []
    expect(control).toMatchObject({
      step: { label: 'Parallel', taskName: 'Parallel' },
      sourceHandle: 'right',
      appendOnly: true
    })
    expect(control.afterCreatedIndex).toBeUndefined()

    for (const child of children) {
      // 자식은 전부 0번(Parallel)에 왼쪽 분기로 붙는다.
      expect(child).toMatchObject({ afterCreatedIndex: 0, sourceHandle: 'left', targetHandle: 'left' })
    }
    expect(children.map((child) => (child.step as { label?: string })?.label)).toEqual([
      '도슨트 대기',
      '이동 음악',
      'Joy'
    ])
  })

  it('chains sequential roots left to right', () => {
    const normalized = normalizeAssistantDraft<AssistantDraftPayload>({
      mode: 'replace',
      roots: [
        { taskName: 'MoveTo', contentName: 'A', children: [] },
        { taskName: 'PlaySound', contentName: 'B', children: [] }
      ]
    })

    expect(normalized?.insertAfter?.[0].afterCreatedIndex).toBeUndefined()
    expect(normalized?.insertAfter?.[1]).toMatchObject({ afterCreatedIndex: 0, sourceHandle: 'right' })
  })

  it('keeps nested control children linked to their own parent', () => {
    // "A 성공하면 B, 실패하면 C" 안에 다시 동시 실행이 들어오는 경우.
    const normalized = normalizeAssistantDraft<AssistantDraftPayload>({
      mode: 'replace',
      roots: [
        {
          taskName: 'IfThenElse',
          children: [
            { taskName: 'PlayMotion', contentName: 'thumb_up', children: [] },
            {
              taskName: 'Parallel',
              children: [{ taskName: 'PlayFace', contentName: 'Love', children: [] }]
            },
            { taskName: 'PlayFace', contentName: 'Idle', children: [] }
          ]
        }
      ]
    })

    const inserts = normalized?.insertAfter ?? []
    expect(inserts).toHaveLength(5)
    // 0=IfThenElse, 1=thumb_up, 2=Parallel, 3=Love(Parallel 자식), 4=Idle
    expect(inserts[2]).toMatchObject({ afterCreatedIndex: 0 })
    expect(inserts[3]).toMatchObject({ afterCreatedIndex: 2 })
    expect(inserts[4]).toMatchObject({ afterCreatedIndex: 0 })

    // 제어 노드 종류와 무관하게 자식은 전부 좌측 핸들에서 나간다.
    for (const child of inserts.slice(1)) {
      expect(child).toMatchObject({ sourceHandle: 'left', targetHandle: 'left' })
    }
    // 제어 노드 자신은 흐름 방향(우측)으로 연결된다.
    expect(inserts[0]).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' })
  })

  it('leaves drafts without roots untouched', () => {
    const draft: AssistantDraftPayload = { mode: 'edit', insertAfter: [{ after: 'Joy', step: 'Love' }] }
    expect(normalizeAssistantDraft(draft)).toBe(draft)
  })
})

describe('isChildAppendInsert', () => {
  it('treats a left-handle append as hanging a child under the anchor', () => {
    // "Parallel 아래에 Joy 추가" / compose 가 만든 제어 노드의 자식
    expect(isChildAppendInsert({ appendOnly: true, sourceHandle: 'left', targetHandle: 'left' })).toBe(true)
  })

  it('treats a right-handle append as continuing the sequence', () => {
    // "Parallel 다음에 pause 추가" / 위치를 말하지 않은 기본 추가
    expect(isChildAppendInsert({ appendOnly: true, sourceHandle: 'right', targetHandle: 'left' })).toBe(false)
  })

  it('is false for inserts that are not appends', () => {
    expect(isChildAppendInsert({ sourceHandle: 'left', targetHandle: 'left' })).toBe(false)
    expect(isChildAppendInsert(undefined)).toBe(false)
  })

  it('marks every child produced from a control-node tree', () => {
    const normalized = normalizeAssistantDraft<AssistantDraftPayload>({
      mode: 'replace',
      roots: [
        {
          taskName: 'Parallel',
          children: [{ taskName: 'PlayFace', contentName: 'Joy' }, { taskName: 'PlaySound', contentName: '이동' }]
        }
      ]
    })

    const inserts = normalized?.insertAfter ?? []
    expect(inserts.map((insert) => isChildAppendInsert(insert))).toEqual([false, true, true])
  })
})

describe('isBranchEdge', () => {
  it('treats a left-handle edge as a control node child link', () => {
    expect(isBranchEdge({ sourceHandle: 'left' })).toBe(true)
  })

  it('treats right-handle and handle-less edges as sequential flow', () => {
    // "Parallel 우측에 Pause" 가 Parallel 의 자식 엣지를 가져가면 자식이 Pause 뒤로 끌려간다.
    expect(isBranchEdge({ sourceHandle: 'right' })).toBe(false)
    expect(isBranchEdge({})).toBe(false)
    expect(isBranchEdge(undefined)).toBe(false)
  })
})

describe('pickFallbackAnchor', () => {
  // "IfThenElse 를 만들고 자식 3개" 를 한 번에 처리하는 중간 상태.
  const created = [
    { id: 'ite', label: 'IfThenElse', isControl: true },
    { id: 'c1', label: 'thumb_up', isControl: false }
  ]

  it('hangs a child under the control node created in this draft, not under the last node', () => {
    expect(pickFallbackAnchor(created, true)?.id).toBe('ite')
  })

  it('continues the sequence from the last created node', () => {
    expect(pickFallbackAnchor(created, false)?.id).toBe('c1')
  })

  it('falls back to the last node when no control node was created', () => {
    expect(pickFallbackAnchor([{ id: 'a', label: 'Joy', isControl: false }], true)?.id).toBe('a')
  })

  it('returns null before anything is created', () => {
    expect(pickFallbackAnchor([], true)).toBeNull()
  })
})

describe('control node properties', () => {
  it('carries delay_msec / num_cycles from the compose tree into the insert step', () => {
    // "3초 기다렸다가 Love 노드 실행해줘"
    const normalized = normalizeAssistantDraft<AssistantDraftPayload>({
      mode: 'replace',
      roots: [
        {
          taskName: 'Delay',
          taskType: 'CONTROL',
          properties: { delay_msec: 3000 },
          children: [{ taskName: 'PlayFace', taskType: 'ACTION', contentName: 'Love', contentId: 301, children: [] }]
        }
      ]
    })

    const [control, child] = normalized?.insertAfter ?? []
    expect(control?.step).toMatchObject({ taskName: 'Delay', properties: { delay_msec: 3000 } })
    expect((child?.step as { properties?: unknown })?.properties).toBeUndefined()
  })
})
