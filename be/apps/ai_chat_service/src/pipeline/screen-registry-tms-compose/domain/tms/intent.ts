import {
  type LinearTaskflowDraftPlan,
  inferLinearStepsFromMessage,
  normalizeNameKey,
} from '../../core'

function inferLinearDraftPlanFromMessage(value: unknown): LinearTaskflowDraftPlan {
  const message = String(value ?? '').trim()
  if (!message) return { mode: 'replace', steps: [] }

  return {
    mode: 'replace',
    steps: inferLinearStepsFromMessage(message),
  }
}

function isNodeLevelEditMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  return /(노드\s*(추가|수정|변경|삭제|지워|제거)|이후에\s*.+\s*(추가|넣어|붙여)|뒤에\s*.+\s*(추가|넣어|붙여))/i.test(text)
}

function isGenericNodePlaceholder(label: unknown): boolean {
  const key = normalizeNameKey(label)
  if (!key) return true

  const placeholders = new Set([
    '노드', '노드하나', '노드한개', 'task', 'tasks', '태스크', '작업', '스텝', '단계', '항목',
  ])

  if (placeholders.has(key)) return true
  if (/^노드\d*$/.test(key)) return true
  if (/^(task|tasks|step|steps)\d*$/.test(key)) return true
  return false
}

function isAmbiguousModeChangeMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksMode = /(모드\s*(바꿔|변경)|방향\s*(바꿔|변경)|정렬\s*방향)/i.test(text)
  if (!asksMode) return false
  const hasDirection = /(가로|세로|horizontal|vertical|tree|default)/i.test(text)
  return !hasDirection
}

function isAmbiguousSaveMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksSave = /(저장\s*해줘|저장\s*해\s*줘|저장)/i.test(text)
  if (!asksSave) return false
  const hasDecisionHint = /(어떤|무슨|종류|방식|뭘로|중에서)/i.test(text)
  if (!hasDecisionHint) return false
  const hasType = /(임시\s*저장|정식\s*저장|최종\s*저장)/i.test(text)
  return !hasType
}

function isDeleteAllNodesMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  if (/(초기화\s*해줘|초기화\s*해\s*줘|초기화|리셋\s*해줘|리셋\s*해\s*줘|리셋|reset)/i.test(text)) {
    return true
  }

  const asksDelete = /(지워줘|지워|삭제해줘|삭제해|삭제|제거해줘|제거해|제거|없애줘|없애)/i.test(text)
  if (!asksDelete) return false

  const allKeyword = /(전부|전체|모두|모든|싹다|다|all|모든\s*노드|전체\s*노드)/i.test(text)
  return allKeyword
}

function detectRequestedFlowMode(message: string): 'default' | 'tree' | null {
  const text = String(message ?? '').trim().toLowerCase()
  if (!text) return null
  if (/(세로\s*모드|세로로|vertical|tree)/i.test(text)) return 'tree'
  if (/(가로\s*모드|가로로|horizontal|default)/i.test(text)) return 'default'
  return null
}

function isAlignRequestMessage(message: string): boolean {
  return /(정렬해줘|정렬\s*해\s*줘|정렬|배치해줘|배치\s*해\s*줘|배열해줘|arrange|align)/i.test(String(message ?? '').trim())
}

function detectSaveCommand(message: string): 'save' | 'temp-save' | null {
  const text = String(message ?? '').trim()
  if (!text) return null
  if (!/(저장)/i.test(text)) return null
  if (/(임시\s*저장)/i.test(text)) return 'temp-save'
  return 'save'
}

function normalizeIntentText(message: string): string {
  return String(message ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function isTaskflowComposeRequest(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  if (/(구성해줘|구성해\s*줘|만들어줘|만들어\s*줘|생성해줘|생성해\s*줘)/i.test(text)) {
    if (/(태스크\s*플로우|태스크\s*플로|태스크플로우|태스크플로|taskflow)/i.test(text)) return true
  }

  const normalized = normalizeIntentText(text)
  if (!normalized) return false

  const composeSignals = [
    '태스크플로우',
    '태스크플로',
    'taskflow',
    'taskflows',
    'taskflow구성',
    'taskflow만들어',
    'taskflow생성',
    'taskflowcompose',
  ]

  return composeSignals.some((signal) => normalized.includes(signal))
}

function isMoveFlowComposeMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text)
  if (!asksCompose) return false

  return /(이동|move|->|→|거쳐|들러|갔다가|에서\s*.+\s*로)/i.test(text)
}

function isPickUpFlowComposeMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text)
  if (!asksCompose) return false

  return /(pickup|pick\s*up|픽업|집기|집어|수거|적재)/i.test(text)
}

function isPlayMotionFlowComposeMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false

  const asksCompose = isTaskflowComposeRequest(text)
  if (!asksCompose) return false

  return /(playmotion|play\s*motion|모션|동작|제스처|포즈)/i.test(text)
}

export {
  detectRequestedFlowMode,
  detectSaveCommand,
  inferLinearDraftPlanFromMessage,
  isDeleteAllNodesMessage,
  isAlignRequestMessage,
  isAmbiguousModeChangeMessage,
  isAmbiguousSaveMessage,
  isGenericNodePlaceholder,
  isMoveFlowComposeMessage,
  isNodeLevelEditMessage,
  isPickUpFlowComposeMessage,
  isPlayMotionFlowComposeMessage,
}
