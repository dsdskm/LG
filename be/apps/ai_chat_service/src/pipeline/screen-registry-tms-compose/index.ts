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

function parseArrowActionChainLabels(message: string, rules: TaskflowLanguageRules): string[] {
  const normalizedMessage = String(message ?? '').trim().replace(/["'`]/g, '')
  if (!normalizedMessage) return []

  const pairSeparators = Array.isArray(rules.connectPairSeparatorPhrases)
    ? rules.connectPairSeparatorPhrases
    : []
  if (pairSeparators.length === 0) return []

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

  const normalizedChain = replaceConfiguredPhrases(
    cleaned,
    pairSeparators,
    ' -> ',
  )
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalizedChain.includes('->')) return []

  const labels = normalizedChain
    .split('->')
    .map((part) => String(part ?? '').replace(/[.,!?]+$/g, '').trim())
    .filter(Boolean)

  return labels.length >= 2 ? labels : []
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
): Array<{ after: string; step: LinearTaskflowStep }> {
  if (steps.length === 0) return []

  const existingKeys = collectExistingNodeNameKeys(flowContext)
  const inserts: Array<{ after: string; step: LinearTaskflowStep }> = []

  const firstStep = steps[0]
  const firstKey = toStepNameKey(firstStep)
  const firstExists = Boolean(firstKey) && existingKeys.has(firstKey)

  if (!firstExists) {
    let previous = ''
    for (const step of steps) {
      inserts.push({
        after: previous,
        step,
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

    if (stepKey && knownKeys.has(stepKey)) {
      const label = String(step.label ?? '').trim()
      if (label) previous = label
      continue
    }

    inserts.push({
      after: previous,
      step,
    })

    if (stepKey) knownKeys.add(stepKey)
    const label = String(step.label ?? '').trim()
    if (label) previous = label
  }

  return inserts
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

      const arrowChainLabels = parseArrowActionChainLabels(userMessage, languageRules)
      if (arrowChainLabels.length < 2) {
        return {
          clarification: '요청 형식이 맞지 않습니다. "A->B" 또는 "A->B->C" 형태(예: "A->B 연결해줘")로 요청해 주세요.',
          needUserInput: true,
        }
      }

      const { steps: actionChainSteps, missing } = resolveArrowActionChainSteps(flowContext, arrowChainLabels)
      if (actionChainSteps.length === 0 || missing.length > 0) {
        const missingPreview = missing.slice(0, 5).join(', ')
        return {
          clarification: missingPreview
            ? `다음 ACTION 노드는 TaskPanel에서 찾지 못했습니다: ${missingPreview}. TaskPanel(contentName) 기준으로 다시 요청해 주세요.`
            : '요청하신 ACTION 노드를 TaskPanel에서 찾지 못했습니다. TaskPanel(contentName) 기준으로 다시 요청해 주세요.',
          needUserInput: true,
        }
      }

      const insertAfter = buildAppendInsertAfterPlan(flowContext, actionChainSteps)
      if (insertAfter.length === 0) {
        return {
          assistantText: `요청하신 ACTION 체인(${arrowChainLabels.join(' -> ')})은 이미 캔버스에 반영되어 있습니다.`,
        }
      }

      return {
        canvasDraft: {
          mode: 'edit',
          layout: 'linear',
          flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
          insertAfter,
        },
        assistantText: `요청하신 ACTION 체인(${arrowChainLabels.join(' -> ')})을 기존 흐름 뒤에 이어서 반영했습니다.`,
      }
    },
  }
}
