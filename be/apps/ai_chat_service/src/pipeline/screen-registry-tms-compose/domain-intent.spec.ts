import { isDeleteAllNodesMessage, isDocentFlowComposeMessage, isMoveFlowComposeMessage } from './domain-intent'

const rules = {
  composeNoisePhrases: ['태스크 플로우', '태스크플로우', 'taskflow', '캔버스', 'canvas'],
  requestTailPhrases: ['해줘', '해 줘', '해주세요'],
  composeVerbPhrases: ['구성해줘', '구성해 줘', '만들어줘', '만들어 줘', '생성해줘', '생성해 줘', '짜줘', '짜 줘', '연결해줘', '연결해 줘', '해줘', '해 줘', '해주세요'],
  taskflowKeywordPhrases: ['태스크 플로우', '태스크 플로', '태스크플로우', '태스크플로', 'taskflow', 'taskflows'],
  composeSignalPhrases: ['태스크플로우', '태스크플로', 'taskflow', 'taskflows', 'taskflow구성', 'taskflow만들어', 'taskflow생성', 'taskflowcompose'],
  nodeLevelEditPhrases: [],
  nodePlaceholderPhrases: ['노드', 'task', 'tasks', '태스크', '작업', '스텝', '단계', '항목'],
  nodePlaceholderPrefixPhrases: ['노드', 'task', 'tasks', 'step', 'steps'],
  modeRequestPhrases: ['모드 바꿔', '모드 변경', '방향 바꿔', '방향 변경', '정렬 방향'],
  modeDirectionTreePhrases: ['세로 모드', '세로로', 'vertical', 'tree'],
  modeDirectionDefaultPhrases: ['가로 모드', '가로로', 'horizontal', 'default'],
  saveRequestPhrases: ['저장', '저장해줘', '저장해 줘'],
  saveDecisionHintPhrases: ['어떤', '무슨', '종류', '방식', '뭘로', '중에서'],
  saveTypeTempPhrases: ['임시 저장'],
  saveTypeFinalPhrases: ['정식 저장', '최종 저장'],
  resetAllPhrases: ['초기화', '리셋', 'reset'],
  deleteRequestPhrases: ['지워줘', '지워', '삭제해줘', '삭제해', '삭제', '제거해줘', '제거해', '제거', '없애줘', '없애'],
  deleteAllScopePhrases: ['전부', '전체', '모두', '모든', '싹다', '다', 'all', '모든 노드', '전체 노드'],
  alignRequestPhrases: ['정렬해줘', '정렬', '배치해줘', '배열해줘', 'arrange', 'align'],
  moveComposeHintPhrases: ['이동', 'move', '->', '→', '거쳐', '들러', '갔다가', '에서', '로'],
  pickupComposeHintPhrases: ['pickup', 'pick up', '픽업', '집기', '집어', '수거', '적재'],
  playMotionComposeHintPhrases: ['playmotion', 'play motion', '모션', '동작', '제스처', '포즈'],
  docentHintPhrases: ['도슨트', 'docent'],
  connectIntentPhrases: ['연결', '이어'],
  connectPairSeparatorPhrases: ['와'],
}

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
      expect(isDeleteAllNodesMessage(phrase, rules)).toBe(true)
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
      expect(isDeleteAllNodesMessage(phrase, rules)).toBe(false)
    }
  })
})

describe('isMoveFlowComposeMessage', () => {
  it('returns true for spaced taskflow phrase', () => {
    expect(isMoveFlowComposeMessage('이동 태스크 플로우 만들어줘', rules)).toBe(true)
  })

  it('returns true for arrow-based action phrases without explicit taskflow keyword', () => {
    const positives = [
      'Agree->Awe 생성해줘',
      'Agree->Awe 구성해줘',
      'Agree->Awe 만들어줘',
      'Agree->Awe 짜줘',
      'Agree->Awe 해줘',
      'Agree->Awe 연결해줘',
    ]

    for (const phrase of positives) {
      expect(isMoveFlowComposeMessage(phrase, rules)).toBe(true)
    }
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
      expect(isMoveFlowComposeMessage(phrase, rules)).toBe(true)
    }
  })
})

describe('isDocentFlowComposeMessage', () => {
  it('returns true for the exact docent compose phrase', () => {
    expect(isDocentFlowComposeMessage('도슨트 태스크플로우 구성해줘', rules)).toBe(true)
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
      expect(isDocentFlowComposeMessage(phrase, rules)).toBe(true)
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
      expect(isDocentFlowComposeMessage(phrase, rules)).toBe(false)
    }
  })
})
