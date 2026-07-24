import { isDeleteAllNodesMessage, isDocentFlowComposeMessage, isMoveFlowComposeMessage } from './domain-intent'

describe('isDeleteAllNodesMessage', () => {
  it('returns true for delete-all phrases', () => {
    const positives = [
      '다 지워줘',
      '초기화 해줘',
      '리셋 해줘',
      '모든 노드 지워줘',
      '다 없애줘',
      '전체 삭제',
      'reset',
    ]

    for (const phrase of positives) {
      expect(isDeleteAllNodesMessage(phrase)).toBe(true)
    }
  })

  it('returns false for non-global delete/edit phrases', () => {
    const negatives = [
      '노드 하나 지워줘',
      'A 노드 삭제해줘',
      'MoveTo 추가해줘',
      '가로 모드로 바꿔줘',
    ]

    for (const phrase of negatives) {
      expect(isDeleteAllNodesMessage(phrase)).toBe(false)
    }
  })
})

describe('isMoveFlowComposeMessage', () => {
  it('returns true for spaced taskflow phrase', () => {
    expect(isMoveFlowComposeMessage('이동 태스크 플로우 만들어줘')).toBe(true)
  })

  it('covers compose phrase variants', () => {
    const positives = [
      '위치1에서 위치2로 이동 태스크 플로우 구성해줘',
      '위치1에서 위치2로 이동 태스크 플로 구성해줘',
      '위치1에서 위치2로 이동 태스크플로우 만들어줘',
      '위치1에서 위치2로 이동 taskflow 생성해줘',
      '위치1에서 위치2로 이동 taskflow+생성해줘',
    ]

    for (const phrase of positives) {
      expect(isMoveFlowComposeMessage(phrase)).toBe(true)
    }
  })
})

describe('isDocentFlowComposeMessage', () => {
  it('returns true for the exact docent compose phrase', () => {
    expect(isDocentFlowComposeMessage('도슨트 태스크플로우 구성해줘')).toBe(true)
  })

  it('returns true for docent compose phrases', () => {
    const positives = [
      '도슨트 구성해줘',
      '도슨트 태스크 플로우 구성해줘',
      '도슨트 태스크 플로우 만들어줘',
      '도슨트 태스크플로우 구성해줘',
      '도슨트 태스크플로우 만들어줘',
      'docent taskflow 만들어줘',
      '도슨트 태스크플로우 생성해줘',
      'docent 구성해줘',
    ]

    for (const phrase of positives) {
      expect(isDocentFlowComposeMessage(phrase)).toBe(true)
    }
  })

  it('returns false for non-compose docent phrases', () => {
    const negatives = [
      '도슨트 설명 보여줘',
      '안내 멘트 알려줘',
      '도슨트',
      '도슨트 뭐야',
    ]

    for (const phrase of negatives) {
      expect(isDocentFlowComposeMessage(phrase)).toBe(false)
    }
  })
})
