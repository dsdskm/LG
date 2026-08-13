import type { ToolDefinition } from '../tool.type'
import {
  includesConfiguredPhrase,
  loadTaskflowLanguageRules,
  replaceConfiguredPhrases,
  type TaskflowLanguageRules,
} from '../taskflow-language-rules'
import {
  type ComposeToolDeps,
  type FlowContextSummary,
  type LinearTaskflowStep,
  buildDraftFromRagTemplate,
  buildDocentFlowDraftFromMessage,
  buildLinearFlowDraftFromSteps,
  buildMoveParallelFlowDraftFromMessage,
  buildPickupPutDownFlowDraftFromMessage,
  buildPlayMotionParallelFlowDraftFromMessage,
  buildReplacedDraftFromFullFlow,
  detectRequestedFlowMode,
  detectSaveCommand,
  inferLinearDraftPlanFromMessage,
  isContentTaskContent,
  isDeleteAllNodesMessage,
  isDocentFlowComposeMessage,
  isAlignRequestMessage,
  isAmbiguousModeChangeMessage,
  isAmbiguousSaveMessage,
  isGenericNodePlaceholder,
  isMoveFlowComposeMessage,
  isNodeLevelEditMessage,
  isPickUpFlowComposeMessage,
  isPlayMotionFlowComposeMessage,
  loadRagTaskflowTemplates,
  pickRagTaskflowTemplate,
  pickTaskContentByStep,
  normalizeNameKey,
  resolveFlowContextSummary,
  resolveMoveFlowContext,
  toLinearTaskflowStep,
} from './helpers'

function toFlowDefinitionFromDraft(draft: Record<string, unknown> | null | undefined) {
  if (!draft || typeof draft !== 'object') return undefined

  const nodes = Array.isArray(draft.nodes) ? draft.nodes : undefined
  const edges = Array.isArray(draft.edges) ? draft.edges : undefined
  if (!nodes || !edges) return undefined

  return {
    nodes,
    edges,
    viewport:
      draft.viewport && typeof draft.viewport === 'object' && !Array.isArray(draft.viewport)
        ? draft.viewport
        : { x: 0, y: 0, zoom: 1 },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
  }
}

function resolveComposeUserMessage(
  contextRow: Record<string, unknown>,
  steps: LinearTaskflowStep[],
  rules: TaskflowLanguageRules,
): string {
  const candidates = [
    contextRow?.__userMessage,
    contextRow?.userMessage,
    contextRow?.message,
    contextRow?.query,
    contextRow?.input,
    contextRow?.prompt,
  ]

  for (const candidate of candidates) {
    const text = String(candidate ?? '').trim()
    if (text) return text
  }

  const stepSummary = normalizeNameKey(
    steps
      .map((step) => `${String(step.label ?? '')} ${String(step.contentName ?? '')} ${String(step.taskName ?? '')}`)
      .join(' '),
  )
  if (!stepSummary) return ''

  const docentHints = Array.isArray(rules.docentHintPhrases) ? rules.docentHintPhrases : []
  const composeVerbs = Array.isArray(rules.composeVerbPhrases) ? rules.composeVerbPhrases : []
  const taskflowKeywords = Array.isArray(rules.taskflowKeywordPhrases) ? rules.taskflowKeywordPhrases : []
  const hasDocentHint = docentHints
    .map((item) => normalizeNameKey(item))
    .filter(Boolean)
    .some((item) => stepSummary.includes(item))

  if (hasDocentHint) {
    const docentToken = String(docentHints[0] ?? '').trim()
    const keywordToken = String(taskflowKeywords[0] ?? '').trim()
    const verbToken = String(composeVerbs[0] ?? '').trim()
    return [docentToken, keywordToken, verbToken].filter(Boolean).join(' ').trim()
  }

  return ''
}

type LinkHandleMode = 'right-left' | 'left-left'

function parseArrowActionChain(message: string, rules: TaskflowLanguageRules): {
  labels: string[]
  linkModes: LinkHandleMode[]
} {
  const normalizedMessage = String(message ?? '').trim().replace(/['"`]/g, '')
  if (!normalizedMessage) return { labels: [], linkModes: [] }

  const cleanArrowPart = (value: string): string =>
    String(value ?? '')
      .replace(/[.,!?]+$/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const normalizeSegment = (value: string): string => {
    const cleaned = replaceConfiguredPhrases(
      replaceConfiguredPhrases(
        replaceConfiguredPhrases(
          replaceConfiguredPhrases(
            String(value ?? ''),
            Array.isArray(rules.composeNoisePhrases) ? rules.composeNoisePhrases : [],
            ' ',
          ),
          Array.isArray(rules.requestTailPhrases) ? rules.requestTailPhrases : [],
          ' ',
        ),
        Array.isArray(rules.composeVerbPhrases) ? rules.composeVerbPhrases : [],
        ' ',
      ),
      Array.isArray(rules.connectIntentPhrases) ? rules.connectIntentPhrases : [],
      ' ',
    )
      .replace(/\s+/g, ' ')
      .trim()

    const withoutTail = replaceConfiguredPhrases(
      cleaned,
      Array.isArray(rules.requestTailPhrases) ? rules.requestTailPhrases : [],
      ' ',
    )
      .replace(/\s+/g, ' ')
      .trim()

    return replaceConfiguredPhrases(
      replaceConfiguredPhrases(withoutTail, Array.isArray(rules.connectPairSeparatorPhrases) ? rules.connectPairSeparatorPhrases : [], ' '),
      Array.isArray(rules.connectLeftPairSeparatorPhrases) ? rules.connectLeftPairSeparatorPhrases : [],
      ' ',
    )
      .replace(/\s+/g, ' ')
      .trim()
  }

  const normalized = replaceConfiguredPhrases(
    replaceConfiguredPhrases(
      replaceConfiguredPhrases(
        replaceConfiguredPhrases(
          normalizedMessage,
          Array.isArray(rules.composeNoisePhrases) ? rules.composeNoisePhrases : [],
          ' ',
        ),
        Array.isArray(rules.requestTailPhrases) ? rules.requestTailPhrases : [],
        ' ',
      ),
      Array.isArray(rules.composeVerbPhrases) ? rules.composeVerbPhrases : [],
      ' ',
    ),
    Array.isArray(rules.connectIntentPhrases) ? rules.connectIntentPhrases : [],
    ' ',
  )
    .replace(/\s+/g, ' ')
    .trim()

  const normalizedWithoutTail = replaceConfiguredPhrases(
    normalized,
    Array.isArray(rules.requestTailPhrases) ? rules.requestTailPhrases : [],
    ' ',
  )
    .replace(/\s+/g, ' ')
    .trim()

  const normalizedWithoutTailAndIntent = replaceConfiguredPhrases(
    normalizedWithoutTail,
    Array.isArray(rules.connectIntentPhrases) ? rules.connectIntentPhrases : [],
    ' ',
  )
    .replace(/\s+/g, ' ')
    .trim()

  if (!/[=>→-]/.test(normalizedWithoutTailAndIntent)) return { labels: [], linkModes: [] }

  const parts = normalizedWithoutTailAndIntent
    .split(/(=>|->|→|>)/)
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)

  if (parts.length < 3) return { labels: [], linkModes: [] }

  const labels: string[] = []
  const linkModes: LinkHandleMode[] = []

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (part === '=>') {
      if (labels.length > 0) linkModes.push('left-left')
      continue
    }

    if (part === '->' || part === '→' || part === '>') {
      if (labels.length > 0) linkModes.push('right-left')
      continue
    }

    const nextPart = parts[index + 1]
    const labelText = part
    const label = cleanArrowPart(normalizeSegment(labelText))
    if (!label) continue
    labels.push(label)
  }

  if (labels.length < 2 || linkModes.length < 1) return { labels: [], linkModes: [] }

  return {
    labels,
    linkModes,
  }
}

function parseArrowActionChainLabels(message: string, rules: TaskflowLanguageRules): string[] {
  const { labels } = parseArrowActionChain(message, rules)
  return labels
}

function parseMultiLineArrowActionChains(
  message: string,
  rules: TaskflowLanguageRules,
): Array<{ labels: string[]; linkModes: LinkHandleMode[] }> {
  const raw = String(message ?? '').trim()
  if (!raw) return []

  const lines = raw
    .split(/\r?\n/)
    .map((line) => String(line ?? '').trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    const single = parseArrowActionChain(raw, rules)
    return single.labels.length >= 2 ? [single] : []
  }

  const chains = lines
    .map((line) => parseArrowActionChain(line, rules))
    .filter((item) => item.labels.length >= 2)

  if (chains.length > 0) return chains

  const fallback = parseArrowActionChain(raw, rules)
  return fallback.labels.length >= 2 ? [fallback] : []
}

type NodeEditIntent =
  | { type: 'add'; label: string }
  | { type: 'remove'; label: string }
  | { type: 'replace'; from: string; to: string }

function normalizeNodeLabelToken(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(을|를|은|는|이|가|으로|로)$/u, '')
    .trim()
}

function extractNodeLabelByRules(
  message: string,
  rules: TaskflowLanguageRules,
  intent: 'add' | 'remove',
): string {
  const removablePhrases = [
    ...(Array.isArray(rules.composeNoisePhrases) ? rules.composeNoisePhrases : []),
    ...(Array.isArray(rules.requestTailPhrases) ? rules.requestTailPhrases : []),
    ...(Array.isArray(rules.composeVerbPhrases) ? rules.composeVerbPhrases : []),
    ...(Array.isArray(rules.taskflowKeywordPhrases) ? rules.taskflowKeywordPhrases : []),
    ...(Array.isArray(rules.connectIntentPhrases) ? rules.connectIntentPhrases : []),
    ...(Array.isArray(rules.nodeLevelEditPhrases) ? rules.nodeLevelEditPhrases : []),
    ...(Array.isArray(rules.nodePlaceholderPrefixPhrases) ? rules.nodePlaceholderPrefixPhrases : []),
    ...(Array.isArray(rules.nodePlaceholderPhrases) ? rules.nodePlaceholderPhrases : []),
    ...(intent === 'remove' && Array.isArray(rules.deleteRequestPhrases) ? rules.deleteRequestPhrases : []),
  ]

  const cleaned = replaceConfiguredPhrases(String(message ?? ''), removablePhrases, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalizeNodeLabelToken(cleaned)
}

function parseNodeEditIntent(message: string, rules: TaskflowLanguageRules): NodeEditIntent | null {
  const text = String(message ?? '').trim()
  if (!text) return null
  if (/->|→|=>/.test(text)) return null

  const normalizedLines = text
    .split(/\r?\n/)
    .map((line) => String(line ?? '').trim())
    .filter(Boolean)

  for (const line of normalizedLines) {
    const simpleReplaceMatch = line.match(/^(.+?)\s*=\s*(.+)$/)
    if (simpleReplaceMatch) {
      const from = normalizeNodeLabelToken(simpleReplaceMatch[1])
      const to = normalizeNodeLabelToken(simpleReplaceMatch[2])
      if (from && to) {
        return { type: 'replace', from, to }
      }
    }

    const removeTokens = line
      .split(/[,;]+/)
      .flatMap((item) => item.split(/\s+/))
      .map((token) => String(token ?? '').trim())
      .filter(Boolean)
      .filter((token) => token.startsWith('!') || token.endsWith('!'))
      .map((token) => normalizeNodeLabelToken(token.replace(/^!+|!+$/g, '')))
      .filter(Boolean)

    if (removeTokens.length > 0) {
      return { type: 'remove', label: removeTokens[0] }
    }

    const isDeleteIntent = includesConfiguredPhrase(line, Array.isArray(rules.deleteRequestPhrases) ? rules.deleteRequestPhrases : [])
    if (isDeleteIntent) {
      const removeLabel = extractNodeLabelByRules(line, rules, 'remove')
      if (removeLabel) {
        return { type: 'remove', label: removeLabel }
      }
      return { type: 'remove', label: '' }
    }

    const isEditIntent = isNodeLevelEditMessage(line, rules)
    if (!isEditIntent) continue

    const addLabel = extractNodeLabelByRules(line, rules, 'add')
    if (addLabel) {
      return { type: 'add', label: addLabel }
    }
  }

  return null
}

function resolveNodeLabelAliases(label: string): string[] {
  return [normalizeNodeLabelToken(label)].filter(Boolean)
}

function resolveAddStepByLabel(
  flowContext: FlowContextSummary | null | undefined,
  label: string,
): LinearTaskflowStep | null {
  const taskContents = Array.isArray(flowContext?.taskContents)
    ? flowContext.taskContents
    : []

  for (const alias of resolveNodeLabelAliases(label)) {
    const matched = pickTaskContentByStep(taskContents, {
      label: alias,
      contentName: alias,
      taskName: alias,
    })

    if (!matched) continue

    const taskId = Number(matched.taskId)
    const contentId = Number(matched.contentId)

    return {
      label: String(matched.contentName ?? matched.label ?? alias).trim() || alias,
      taskName: String(matched.taskName ?? '').trim() || undefined,
      contentName: String(matched.contentName ?? matched.label ?? '').trim() || undefined,
      taskId: Number.isFinite(taskId) && taskId > 0 ? taskId : undefined,
      contentId: Number.isFinite(contentId) && contentId > 0 ? contentId : undefined,
    }
  }

  return null
}

function resolveArrowActionChainSteps(
  flowContext: FlowContextSummary | null | undefined,
  labels: string[],
): { steps: LinearTaskflowStep[]; missing: string[] } {
  const taskContents = Array.isArray(flowContext?.taskContents)
    ? flowContext.taskContents
    : []

  // 팔레트에 없더라도 현재 플로우 노드에서 찾을 수 있으면 사용한다.
  const flowNodes = Array.isArray(flowContext?.nodes) ? flowContext.nodes : []

  const steps: LinearTaskflowStep[] = []
  const missing: string[] = []

  for (const label of labels) {
    const labelKey = normalizeNameKey(label)

    const matched = pickTaskContentByStep(taskContents, {
      label,
      contentName: label,
      taskName: label,
      taskType: 'ACTION',
    })

    if (matched) {
      const matchedKind = normalizeNameKey(matched.kind)
      const inferredTaskType = matchedKind === 'controltasknode' ? 'CONTROL' : 'ACTION'
      steps.push({
        label: String(matched.contentName ?? matched.label ?? label).trim() || label,
        taskName: String(matched.taskName ?? '').trim() || undefined,
        contentName: String(matched.contentName ?? matched.label ?? '').trim() || undefined,
        taskType: inferredTaskType,
        taskId: Number.isFinite(Number(matched.taskId)) ? Number(matched.taskId) : undefined,
        contentId: Number.isFinite(Number(matched.contentId)) ? Number(matched.contentId) : undefined,
      })
      continue
    }

    // 팔레트에 없으면 현재 플로우 노드에서 fallback 탐색한다.
    const flowNode = flowNodes.find((node) => {
      if (normalizeNameKey(String((node as any)?.id ?? '')) === 'start') return false
      return (
        normalizeNameKey((node as any)?.label) === labelKey ||
        normalizeNameKey((node as any)?.contentName) === labelKey ||
        normalizeNameKey((node as any)?.taskName) === labelKey
      )
    }) as Record<string, unknown> | undefined

    if (flowNode) {
      steps.push({
        label: String(flowNode.contentName ?? flowNode.label ?? flowNode.taskName ?? label).trim() || label,
        taskName: String(flowNode.taskName ?? '').trim() || undefined,
        contentName: String(flowNode.contentName ?? flowNode.label ?? '').trim() || undefined,
        taskType: 'ACTION',
        taskId: Number.isFinite(Number(flowNode.taskId)) ? Number(flowNode.taskId) : undefined,
        contentId: Number.isFinite(Number(flowNode.contentId)) ? Number(flowNode.contentId) : undefined,
      })
      continue
    }

    missing.push(label)
  }

  return { steps, missing }
}

function collectExistingNodeNameKeys(flowContext: FlowContextSummary | null | undefined): Set<string> {
  const nodes = Array.isArray(flowContext?.nodes) ? flowContext.nodes : []
  const keys = new Set<string>()

  for (const node of nodes) {
    const idKey = normalizeNameKey(node?.id)
    if (idKey === 'start') continue

    const candidates = [node?.label, node?.contentName, node?.taskName]
    for (const candidate of candidates) {
      const key = normalizeNameKey(candidate)
      if (key) keys.add(key)
    }
  }

  return keys
}

function toStepNameKey(step: LinearTaskflowStep): string {
  return normalizeNameKey(step.contentName ?? step.label ?? step.taskName)
}

function buildAppendInsertAfterPlan(
  flowContext: FlowContextSummary | null | undefined,
  steps: LinearTaskflowStep[],
  options?: {
    linkModes?: LinkHandleMode[]
    forceInsertTargets?: boolean
    appendOnly?: boolean
  },
): Array<{
  after: string
  step: LinearTaskflowStep
  sourceHandle?: 'left' | 'right'
  targetHandle?: 'left' | 'right'
  reverseDirection?: boolean
  appendOnly?: boolean
}> {
  if (steps.length === 0) return []

  const linkModes = Array.isArray(options?.linkModes) ? options?.linkModes : []
  const forceInsertTargets = Boolean(options?.forceInsertTargets)
  const appendOnly = Boolean(options?.appendOnly)

  const resolveHandles = (index: number): { sourceHandle?: 'left' | 'right'; targetHandle?: 'left' | 'right' } => {
    const mode = Array.isArray(linkModes) ? linkModes[index] : undefined
    if (mode === 'left-left') {
      return { sourceHandle: 'left', targetHandle: 'left' }
    }
    if (mode === 'right-left') {
      return { sourceHandle: 'right', targetHandle: 'left' }
    }
    return {}
  }

  const existingKeys = collectExistingNodeNameKeys(flowContext)
  const inserts: Array<{
    after: string
    step: LinearTaskflowStep
    sourceHandle?: 'left' | 'right'
    targetHandle?: 'left' | 'right'
    reverseDirection?: boolean
    appendOnly?: boolean
  }> = []

  const firstStep = steps[0]
  const firstKey = toStepNameKey(firstStep)
  const firstExists = Boolean(firstKey) && existingKeys.has(firstKey)

  if (!firstExists) {
    const secondStep = steps[1]
    const secondKey = secondStep ? toStepNameKey(secondStep) : ''
    const secondExists = Boolean(secondKey) && existingKeys.has(secondKey)

    // 첫 노드가 없고 두 번째 노드가 이미 있는 경우, 첫 노드를 두 번째 노드 "앞"에 삽입한다.
    // 예: B=>Awe 에서 Awe만 존재하면 B(left) -> Awe(left)로 연결.
    if (!forceInsertTargets && secondStep && secondExists) {
      inserts.push({
        after: String(secondStep.label ?? '').trim(),
        step: firstStep,
        ...resolveHandles(0),
        reverseDirection: true,
        appendOnly,
      })

      const knownKeys = new Set<string>(existingKeys)
      if (firstKey) knownKeys.add(firstKey)
      let previous = String(secondStep.label ?? '').trim()

      for (let index = 2; index < steps.length; index += 1) {
        const step = steps[index]
        const stepKey = toStepNameKey(step)

        if (stepKey && knownKeys.has(stepKey)) {
          const label = String(step.label ?? '').trim()
          if (label) previous = label
          continue
        }

        inserts.push({
          after: previous,
          step,
          ...resolveHandles(index - 1),
          appendOnly,
        })

        if (stepKey) knownKeys.add(stepKey)
        const label = String(step.label ?? '').trim()
        if (label) previous = label
      }

      return inserts
    }

    let previous = ''
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      const handles = index > 0 ? resolveHandles(index - 1) : {}
      inserts.push({
        after: previous,
        step,
        ...handles,
        appendOnly,
      })
      const label = String(step.label ?? '').trim()
      previous = label || previous
    }
    return inserts
  }

  let previous = String(firstStep.label ?? '').trim()
  const knownKeys = new Set<string>(existingKeys)

  for (let index = 1; index < steps.length; index += 1) {
    const step = steps[index]
    const stepKey = toStepNameKey(step)

    if (!forceInsertTargets && stepKey && knownKeys.has(stepKey)) {
      const label = String(step.label ?? '').trim()
      if (label) previous = label
      continue
    }

    inserts.push({
      after: previous,
      step,
      ...resolveHandles(index - 1),
      appendOnly,
    })

    if (stepKey) knownKeys.add(stepKey)
    const label = String(step.label ?? '').trim()
    if (label) previous = label
  }

  return inserts
}

function buildSequentialInsertPlanFromChains(
  chains: Array<{ labels: string[]; linkModes: LinkHandleMode[] }>,
  flowContext: FlowContextSummary | null | undefined,
): {
  insertAfter: Array<{
    after: string
    step: LinearTaskflowStep
    sourceHandle?: 'left' | 'right'
    targetHandle?: 'left' | 'right'
    appendOnly?: boolean
    isolated?: boolean
  }>
  missing: string[]
} {
  const insertAfter: Array<{
    after: string
    step: LinearTaskflowStep
    sourceHandle?: 'left' | 'right'
    targetHandle?: 'left' | 'right'
    appendOnly?: boolean
    isolated?: boolean
  }> = []
  const missing: string[] = []

  const existingNodeKeys = collectExistingNodeNameKeys(flowContext)
  const flowNodes = Array.isArray(flowContext?.nodes) ? flowContext.nodes : []
  const hasNonStartNodes = flowNodes.some((n) => normalizeNameKey(String((n as any)?.id ?? '')) !== 'start')

  // 이전 체인 끝 노드 키 — 같은 이름이면 isolated 생략해 체인을 이어붙인다.
  let lastTailKey: string | null = null

  for (const chain of chains) {
    const { labels, linkModes } = chain
    const { steps, missing: unresolved } = resolveArrowActionChainSteps(flowContext, labels)
    if (unresolved.length > 0) {
      missing.push(...unresolved)
      continue
    }

    if (steps.length < 2) continue

    const firstStep = steps[0]
    const firstKey = normalizeNameKey(firstStep.contentName ?? firstStep.label ?? firstStep.taskName ?? '')
    const isContinuation = lastTailKey !== null && lastTailKey === firstKey
    if (!isContinuation) {
      insertAfter.push({
        after: '',
        step: firstStep,
        // Start만 있는 빈 플로우면 Start에 연결, 그 외엔 독립 배치
        ...(hasNonStartNodes ? { isolated: true } : {}),
      })
    }

    for (let index = 1; index < steps.length; index += 1) {
      const after = String(steps[index - 1]?.label ?? '').trim()
      const step = steps[index]
      const mode = linkModes[index - 1]

      insertAfter.push({
        after,
        step,
        sourceHandle: mode === 'left-left' ? 'left' : 'right',
        targetHandle: 'left',
        appendOnly: true,
      })
    }

    const lastStep = steps[steps.length - 1]
    lastTailKey = normalizeNameKey(lastStep?.contentName ?? lastStep?.label ?? lastStep?.taskName ?? '')
  }

  return { insertAfter, missing }
}

function matchesDirectActionTaskSequence(
  taskList: Array<Record<string, unknown>>,
  steps: LinearTaskflowStep[],
): boolean {
  if (steps.length === 0 || taskList.length === 0) return false

  return steps.every((step) => {
    const stepLabel = normalizeNameKey(step.label)
    const stepTaskName = normalizeNameKey(step.taskName)
    if (!stepLabel && !stepTaskName) return false

    return taskList.some((item) => {
      const itemLabel = normalizeNameKey(item.label)
      const itemTaskName = normalizeNameKey(item.taskName)
      if (stepTaskName) {
        return itemTaskName === stepTaskName || itemLabel === stepTaskName
      }
      return itemLabel === stepLabel || itemTaskName === stepLabel
    })
  })
}

export function createComposeLinearTaskflowTool(deps: ComposeToolDeps): ToolDefinition {
  return {
    declaration: {
      name: 'compose_linear_taskflow',
      description:
        '사용자 요청을 저장 전 캔버스에 바로 적용할 수 있는 직선 태스크플로우 초안(JSON)으로 구성한다.',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            description: 'Start 다음 순서대로 배치할 단계 목록. CONTROL 노드 없이 직선으로만 구성한다.',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '노드 라벨(필수)' },
                taskName: { type: 'string', description: '예: MoveTo' },
                contentName: { type: 'string', description: '콘텐츠/POI 이름' },
                taskType: { type: 'string' },
                taskId: { type: 'number' },
                contentId: { type: 'number' },
                properties: { type: 'object' },
              },
              required: ['label'],
            },
          },
          flowMode: {
            type: 'string',
            enum: ['default', 'tree'],
            description: '캔버스 방향. 직선 진행은 default 권장.',
          },
        },
        required: ['steps'],
      },
    },
    async execute(args, ctx) {
      const provided = Array.isArray(args?.steps) ? args.steps : []
      const normalized = provided
        .map((item) => toLinearTaskflowStep(item))
        .filter((item): item is LinearTaskflowStep => Boolean(item))

      const contextRow = (ctx.context as Record<string, unknown>)
      const languageRules = await loadTaskflowLanguageRules('tms/taskflows/:taskFlowId/canvas')
      const userMessage = resolveComposeUserMessage(contextRow, normalized, languageRules)
      const { flowContext } = resolveFlowContextSummary(contextRow)

          const lines = userMessage
        .split(/\r?\n/)
        .map((line) => String(line ?? '').trim())
        .filter(Boolean)

      const removeByName: string[] = []
      const replaceByName: Array<{ target: string; step: LinearTaskflowStep }> = []
      const insertAfter: Array<{
        after: string
        step: LinearTaskflowStep
        sourceHandle?: 'left' | 'right'
        targetHandle?: 'left' | 'right'
        reverseDirection?: boolean
        appendOnly?: boolean
      }> = []
      const missing: string[] = []

      const arrowChains: Array<{ labels: string[]; linkModes: LinkHandleMode[] }> = []

      for (const line of lines) {
        const arrowChain = parseArrowActionChain(line, languageRules)
        if (arrowChain.labels.length >= 2) {
          arrowChains.push(arrowChain)
          continue
        }

        const intent = parseNodeEditIntent(line, languageRules)
        if (!intent) continue

        if (intent.type === 'remove') {
          const target = normalizeNodeLabelToken(intent.label)
          if (target) removeByName.push(target)
          continue
        }

        if (intent.type === 'replace') {
          const step = resolveAddStepByLabel(flowContext, intent.to)
          if (step) {
            replaceByName.push({ target: intent.from, step })
          } else {
            missing.push(intent.to)
          }
          continue
        }

        const step = resolveAddStepByLabel(flowContext, intent.label)
        if (step) {
          insertAfter.push({ after: '', step })
        } else {
          missing.push(intent.label)
        }
      }

      if (arrowChains.length > 0) {
        const plan = buildSequentialInsertPlanFromChains(arrowChains, flowContext)
        insertAfter.push(...plan.insertAfter)
        missing.push(...plan.missing)
      }

      const hasAnyAction = insertAfter.length > 0 || removeByName.length > 0 || replaceByName.length > 0
      if (!hasAnyAction) {
        return {
          clarification:
            '요청 형식이 맞지 않습니다. "A->B", "A=>B", "A->B->C", "!A", "A=C" 또는 여러 줄 입력(예: "A->B\nC!\nD=E")으로 요청해 주세요.',
          needUserInput: true,
        }
      }

      const chainText = lines.join(' | ')
      const missingUnique = Array.from(new Set(missing.map((item) => String(item ?? '').trim()).filter(Boolean)))
      const partialNote =
        missingUnique.length > 0
          ? ` 찾지 못한 노드는 제외했습니다: ${missingUnique.slice(0, 5).join(', ')}${missingUnique.length > 5 ? ' 외' : ''}.`
          : ''

      const insertedLabels = insertAfter.map((item) => String(item.step?.label ?? '').trim()).filter(Boolean)
      const actionLabel = insertedLabels.length > 0
        ? insertedLabels.join(', ')
        : chainText

      return {
        canvasDraft: {
          mode: 'edit',
          layout: 'linear',
          flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
          insertAfter,
          removeByName,
          replaceByName,
        },
        assistantText: `요청하신 작업(${chainText})을 반영했습니다.${partialNote} 처리된 노드: ${actionLabel}`,
      }
    },
  }
}
