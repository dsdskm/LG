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
  const normalizedMessage = String(message ?? '').trim().replace(/["'`]/g, '')
  if (!normalizedMessage) return { labels: [], linkModes: [] }

  const cleanArrowPart = (value: string): string =>
    String(value ?? '')
      .replace(/[.,!?]+$/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const cleaned = replaceConfiguredPhrases(
    replaceConfiguredPhrases(
      replaceConfiguredPhrases(
        replaceConfiguredPhrases(
          normalizedMessage,
          rules.composeNoisePhrases,
          ' ',
        ),
        rules.requestTailPhrases,
        ' ',
      ),
      rules.composeVerbPhrases,
      ' ',
    ),
    rules.connectIntentPhrases,
    ' ',
  )
    .replace(/\s+/g, ' ')
    .trim()

  const rightSeparators = Array.isArray(rules.connectPairSeparatorPhrases)
    ? rules.connectPairSeparatorPhrases
    : []
  const leftSeparators = Array.isArray(rules.connectLeftPairSeparatorPhrases)
    ? rules.connectLeftPairSeparatorPhrases
    : []
  if (rightSeparators.length === 0 && leftSeparators.length === 0) {
    return { labels: [], linkModes: [] }
  }

  const pairSeparators = Array.isArray(rules.connectPairSeparatorPhrases)
    ? rules.connectPairSeparatorPhrases
    : []

  const leftToken = '__SEP_LL__'
  const rightToken = '__SEP_RL__'

  const marked = replaceConfiguredPhrases(
    replaceConfiguredPhrases(cleaned, leftSeparators, ` ${leftToken} `),
    pairSeparators,
    ` ${rightToken} `,
  )
    .replace(/\s+/g, ' ')
    .trim()

  const parts = marked
    .split(/(__SEP_LL__|__SEP_RL__)/)
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)

  if (parts.length < 3) {
    return { labels: [], linkModes: [] }
  }

  const labels: string[] = []
  const linkModes: LinkHandleMode[] = []

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (part === leftToken || part === rightToken) {
      if (labels.length === 0) continue
      linkModes.push(part === leftToken ? 'left-left' : 'right-left')
      continue
    }
    const label = cleanArrowPart(part)
    if (!label) continue
    labels.push(label)
  }

  if (labels.length < 2 || linkModes.length < 1) {
    return { labels: [], linkModes: [] }
  }

  // 보정: 비정상 토큰 수로 mode 개수가 모자라면 마지막 모드를 반복 적용한다.
  if (linkModes.length < labels.length - 1) {
    const fallbackMode = linkModes[linkModes.length - 1] ?? 'right-left'
    while (linkModes.length < labels.length - 1) linkModes.push(fallbackMode)
  }

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
  if (/->|→/.test(text)) return null

  const isDeleteIntent = includesConfiguredPhrase(text, Array.isArray(rules.deleteRequestPhrases) ? rules.deleteRequestPhrases : [])
  if (isDeleteIntent) {
    const removeLabel = extractNodeLabelByRules(text, rules, 'remove')
    if (removeLabel) {
      return { type: 'remove', label: removeLabel }
    }
    return { type: 'remove', label: '' }
  }

  const isEditIntent = isNodeLevelEditMessage(text, rules)
  if (!isEditIntent) return null

  const addLabel = extractNodeLabelByRules(text, rules, 'add')
  if (addLabel) {
    return { type: 'add', label: addLabel }
  }

  return null
}

function resolveNodeLabelAliases(label: string): string[] {
  const base = normalizeNodeLabelToken(label)
  if (!base) return []

  const aliases = new Set<string>([base])
  const key = normalizeNameKey(base)

  if (['or', '오알', '분기', '병렬', 'parallel'].includes(key)) {
    aliases.add('Parallel')
    aliases.add('병렬')
    aliases.add('OR')
  }

  return Array.from(aliases)
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

  const actionCandidates = taskContents.filter((item) => isContentTaskContent(item))

  const steps: LinearTaskflowStep[] = []
  const missing: string[] = []

  for (const label of labels) {
    const matched = pickTaskContentByStep(actionCandidates, {
      label,
      contentName: label,
      taskType: 'ACTION',
    })

    if (!matched) {
      missing.push(label)
      continue
    }

    steps.push({
      label: String(matched.contentName ?? matched.label ?? label).trim() || label,
      taskName: String(matched.taskName ?? '').trim() || undefined,
      contentName: String(matched.contentName ?? matched.label ?? '').trim() || undefined,
      taskType: 'ACTION',
      taskId: Number.isFinite(Number(matched.taskId)) ? Number(matched.taskId) : undefined,
      contentId: Number.isFinite(Number(matched.contentId)) ? Number(matched.contentId) : undefined,
    })
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
  }>
  missing: string[]
} {
  const insertAfter: Array<{
    after: string
    step: LinearTaskflowStep
    sourceHandle?: 'left' | 'right'
    targetHandle?: 'left' | 'right'
    appendOnly?: boolean
  }> = []
  const missing: string[] = []

  for (const chain of chains) {
    const { labels, linkModes } = chain
    const { steps, missing: unresolved } = resolveArrowActionChainSteps(flowContext, labels)
    if (unresolved.length > 0) {
      missing.push(...unresolved)
      continue
    }

    if (steps.length < 2) continue

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

      const nodeEditIntent = parseNodeEditIntent(userMessage, languageRules)
      if (nodeEditIntent?.type === 'remove') {
        const target = normalizeNodeLabelToken(nodeEditIntent.label)
        if (!target) {
          return {
            clarification: '삭제할 노드 이름을 알려주세요. 예: "A 노드 제거해줘"',
            needUserInput: true,
          }
        }

        return {
          canvasDraft: {
            mode: 'edit',
            layout: 'linear',
            flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
            removeByName: [target],
          },
          assistantText: `${target} 노드를 기존 흐름에서 제거했습니다.`,
        }
      }

      if (nodeEditIntent?.type === 'add') {
        const rawLabel = normalizeNodeLabelToken(nodeEditIntent.label)
        if (!rawLabel || isGenericNodePlaceholder(rawLabel, languageRules)) {
          return {
            clarification: '추가할 노드 이름을 알려주세요. 예: "B 노드 추가해줘"',
            needUserInput: true,
          }
        }

        const step = resolveAddStepByLabel(flowContext, rawLabel)
        if (!step) {
          return {
            clarification: `추가할 노드(${rawLabel})를 TaskPanel에서 찾지 못했습니다. TaskPanel 라벨 기준으로 다시 요청해 주세요.`,
            needUserInput: true,
          }
        }

        return {
          canvasDraft: {
            mode: 'edit',
            layout: 'linear',
            flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
            insertAfter: [
              {
                after: '',
                step,
              },
            ],
          },
          assistantText: `${String(step.label ?? rawLabel)} 노드를 기존 흐름에 추가했습니다.`,
        }
      }

      const arrowChains = parseMultiLineArrowActionChains(userMessage, languageRules)
      if (arrowChains.length === 0) {
        return {
          clarification:
            '요청 형식이 맞지 않습니다. "A->B", "A=>B", "A->B->C" 또는 여러 줄 입력(예: "A->B\nA=>C\nB->D")으로 요청해 주세요.',
          needUserInput: true,
        }
      }

      const { insertAfter, missing } = buildSequentialInsertPlanFromChains(arrowChains, flowContext)
      if (insertAfter.length === 0) {
        const missingPreview = missing.slice(0, 5).join(', ')
        return {
          clarification: missingPreview
            ? `다음 ACTION 노드는 TaskPanel에서 찾지 못했습니다: ${missingPreview}. TaskPanel(contentName) 기준으로 다시 요청해 주세요.`
            : '요청하신 ACTION 노드를 TaskPanel에서 찾지 못했습니다. TaskPanel(contentName) 기준으로 다시 요청해 주세요.',
          needUserInput: true,
        }
      }
      const chainText = arrowChains
        .map((chain) => chain.labels.join(' -> '))
        .join(' | ')
      const missingUnique = Array.from(new Set(missing.map((item) => String(item ?? '').trim()).filter(Boolean)))
      const partialNote =
        missingUnique.length > 0
          ? ` 찾지 못한 노드는 제외했습니다: ${missingUnique.slice(0, 5).join(', ')}${missingUnique.length > 5 ? ' 외' : ''}.`
          : ''

      return {
        canvasDraft: {
          mode: 'edit',
          layout: 'linear',
          flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
          insertAfter,
        },
        assistantText: `요청하신 ACTION 연결(${chainText})을 순차적으로 반영했습니다.${partialNote}`,
      }
    },
  }
}
