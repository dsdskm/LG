import { resolveTaskflowContextSource } from '../../taskflow-context-source.util'
import { inferMoveStepsFromMessage } from '../../taskflow-move-parser.util'
import type { TaskflowLanguageRules } from '../../taskflow-language-rules'

type LinearTaskflowStep = {
  label: string
  taskName?: string
  contentName?: string
  taskType?: string
  taskId?: number
  contentId?: number
  properties?: Record<string, unknown>
}

type LinearTaskflowInsertAfter = {
  after: string
  step: LinearTaskflowStep
}

type LinearTaskflowDraftPlan = {
  mode: 'replace' | 'edit'
  steps?: LinearTaskflowStep[]
  removeByName?: string[]
  insertAfter?: LinearTaskflowInsertAfter[]
}

type FlowContextNodeSummary = {
  id?: string
  label?: string
  nodeType?: string
  taskName?: string
  contentName?: string
}

type FlowContextTaskSummary = {
  taskId?: number
  label?: string
  taskName?: string
  kind?: string
}

type FlowContextTaskCandidate = {
  taskId?: number
  taskName?: string
  label?: string
  kind?: string
  contentId?: number
  contentName?: string
}

type FlowContextTaskContentSummary = {
  taskId?: number
  taskName?: string
  label?: string
  kind?: string
  contentId?: number
  contentName?: string
}

type FlowContextSummary = {
  taskFlowId?: number
  nodeCount?: number
  edgeCount?: number
  tails?: string[]
  branchingCount?: number
  ambiguousInsertion?: boolean
  linearOrder?: string[]
  nodes?: FlowContextNodeSummary[]
  taskList?: FlowContextTaskSummary[]
  taskContents?: FlowContextTaskContentSummary[]
  addableNodes?: Array<Record<string, unknown>>
  flowDefinition?: {
    nodes?: Array<Record<string, unknown>>
    edges?: Array<Record<string, unknown>>
    viewport?: Record<string, unknown>
    flowMode?: 'default' | 'tree'
  }
  fullFlow?: {
    nodes?: Array<Record<string, unknown>>
    edges?: Array<Record<string, unknown>>
    viewport?: Record<string, unknown>
    flowMode?: 'default' | 'tree'
  }
}

type RagTaskflowTemplate = {
  templateKey: string
  triggerPhrases: string[]
  assistantText?: string
  behaviorTreeXml?: string
  canvasDraft: {
    nodes: Array<Record<string, unknown>>
    edges: Array<Record<string, unknown>>
    viewport?: Record<string, unknown>
    flowMode?: 'default' | 'tree'
    layout?: string
  }
}

type ComposeToolDeps = {
  logger: { log: (msg: string) => void }
}

function toLinearTaskflowStep(input: unknown): LinearTaskflowStep | null {
  if (typeof input === 'string') {
    const label = input.trim()
    if (!label) return null
    return { label }
  }

  if (!input || typeof input !== 'object') return null
  const row = input as Record<string, unknown>

  const label = String(
    row.label ?? row.title ?? row.name ?? row.contentName ?? row.content ?? row.destination ?? '',
  ).trim()
  if (!label) return null

  const taskName = String(row.taskName ?? row.task ?? '').trim() || undefined
  const contentName = String(row.contentName ?? row.content ?? '').trim() || undefined
  const taskType = String(row.taskType ?? '').trim() || undefined

  const taskIdRaw = Number(row.taskId)
  const contentIdRaw = Number(row.contentId)

  const properties = row.properties && typeof row.properties === 'object' && !Array.isArray(row.properties)
    ? (row.properties as Record<string, unknown>)
    : undefined

  return {
    label,
    taskName,
    contentName,
    taskType,
    taskId: Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? taskIdRaw : undefined,
    contentId: Number.isFinite(contentIdRaw) && contentIdRaw > 0 ? contentIdRaw : undefined,
    properties,
  }
}

function inferLinearStepsFromMessage(value: unknown, rules?: TaskflowLanguageRules): LinearTaskflowStep[] {
  return inferMoveStepsFromMessage(value, rules)
}

function normalizeNameToken(value: unknown): string {
  return String(value ?? '').trim().replace(/["'`]/g, '').replace(/\s+/g, ' ').trim()
}

function toFlowContextSummary(input: unknown): FlowContextSummary | null {
  if (!input || typeof input !== 'object') return null
  const row = input as Record<string, unknown>

  const nodeListInput = Array.isArray(row.nodes)
    ? row.nodes
    : Array.isArray(row.currentNodeList)
      ? row.currentNodeList
      : []

  const edgeListInput = Array.isArray(row.edges)
    ? row.edges
    : Array.isArray(row.currentEdgeList)
      ? row.currentEdgeList
      : []

  const tails = Array.isArray(row.tails)
    ? row.tails.map((value) => normalizeNameToken(value)).filter(Boolean)
    : []

  const linearOrder = Array.isArray(row.linearOrder)
    ? row.linearOrder.map((value) => normalizeNameToken(value)).filter(Boolean)
    : []

  const nodes: FlowContextNodeSummary[] = nodeListInput.length > 0
    ? nodeListInput.reduce<FlowContextNodeSummary[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const node = item as Record<string, unknown>
      const data = node.data && typeof node.data === 'object' && !Array.isArray(node.data)
        ? (node.data as Record<string, unknown>)
        : {}

      acc.push({
        id: String(node.id ?? '').trim() || undefined,
        label: normalizeNameToken(node.label ?? data.label ?? node.contentName ?? data.contentName ?? node.taskName ?? data.taskName) || undefined,
        nodeType: normalizeNameToken(node.nodeType ?? node.type),
        taskName: normalizeNameToken(node.taskName ?? data.taskName) || undefined,
        contentName: normalizeNameToken(node.contentName ?? data.contentName) || undefined,
      })
      return acc
    }, [])
    : []

  const taskList: FlowContextTaskSummary[] = Array.isArray(row.taskList)
    ? row.taskList.reduce<FlowContextTaskSummary[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const task = item as Record<string, unknown>
      const taskId = Number(task.taskId)
      acc.push({
        taskId: Number.isFinite(taskId) ? taskId : undefined,
        label: normalizeNameToken(task.label) || undefined,
        taskName: normalizeNameToken(task.taskName) || undefined,
        kind: normalizeNameToken(task.kind) || undefined,
      })
      return acc
    }, [])
    : []

  const taskContentsInput = Array.isArray(row.taskContents)
    ? row.taskContents
    : Array.isArray(row.taskcontents)
      ? row.taskcontents
      : []

  const taskContents: FlowContextTaskContentSummary[] = Array.isArray(taskContentsInput)
    ? taskContentsInput.reduce<FlowContextTaskContentSummary[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const content = item as Record<string, unknown>
      const taskId = Number(content.taskId)
      const contentId = Number(content.contentId)
      acc.push({
        taskId: Number.isFinite(taskId) ? taskId : undefined,
        taskName: normalizeNameToken(content.taskName) || undefined,
        label: normalizeNameToken(content.label) || undefined,
        kind: normalizeNameToken(content.kind) || undefined,
        contentId: Number.isFinite(contentId) ? contentId : undefined,
        contentName: normalizeNameToken(content.contentName) || undefined,
      })
      return acc
    }, [])
    : []

  const addableNodes = Array.isArray(row.addableNodes)
    ? row.addableNodes.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>
    : taskContents.length > 0
      ? taskContents as Array<Record<string, unknown>>
      : []

  const flowDefinitionInput =
    row.flowDefinition && typeof row.flowDefinition === 'object' && !Array.isArray(row.flowDefinition)
      ? (row.flowDefinition as Record<string, unknown>)
      : row.fullFlow && typeof row.fullFlow === 'object' && !Array.isArray(row.fullFlow)
        ? (row.fullFlow as Record<string, unknown>)
        : nodeListInput.length > 0 || edgeListInput.length > 0
          ? {
            nodes: nodeListInput,
            edges: edgeListInput,
            viewport: row.viewport,
            flowMode: row.flowMode,
          }
          : undefined

  return {
    taskFlowId: Number.isFinite(Number(row.taskFlowId)) ? Number(row.taskFlowId) : undefined,
    nodeCount: Number.isFinite(Number(row.nodeCount)) ? Number(row.nodeCount) : undefined,
    edgeCount: Number.isFinite(Number(row.edgeCount)) ? Number(row.edgeCount) : undefined,
    tails,
    branchingCount: Number.isFinite(Number(row.branchingCount)) ? Number(row.branchingCount) : undefined,
    ambiguousInsertion: Boolean(row.ambiguousInsertion),
    linearOrder,
    nodes,
    taskList,
    taskContents,
    addableNodes,
    flowDefinition: flowDefinitionInput
      ? {
        nodes: Array.isArray(flowDefinitionInput.nodes)
          ? (flowDefinitionInput.nodes as Array<Record<string, unknown>>)
          : [],
        edges: Array.isArray(flowDefinitionInput.edges)
          ? (flowDefinitionInput.edges as Array<Record<string, unknown>>)
          : [],
        viewport:
          flowDefinitionInput.viewport && typeof flowDefinitionInput.viewport === 'object' && !Array.isArray(flowDefinitionInput.viewport)
            ? (flowDefinitionInput.viewport as Record<string, unknown>)
            : undefined,
        flowMode: flowDefinitionInput.flowMode === 'tree' ? 'tree' : 'default',
      }
      : undefined,
    fullFlow:
      row.fullFlow && typeof row.fullFlow === 'object' && !Array.isArray(row.fullFlow)
        ? {
          nodes: Array.isArray((row.fullFlow as Record<string, unknown>).nodes)
            ? ((row.fullFlow as Record<string, unknown>).nodes as Array<Record<string, unknown>>)
            : [],
          edges: Array.isArray((row.fullFlow as Record<string, unknown>).edges)
            ? ((row.fullFlow as Record<string, unknown>).edges as Array<Record<string, unknown>>)
            : [],
          viewport:
            (row.fullFlow as Record<string, unknown>).viewport &&
              typeof (row.fullFlow as Record<string, unknown>).viewport === 'object' &&
              !Array.isArray((row.fullFlow as Record<string, unknown>).viewport)
              ? ((row.fullFlow as Record<string, unknown>).viewport as Record<string, unknown>)
              : undefined,
          flowMode: (row.fullFlow as Record<string, unknown>).flowMode === 'tree' ? 'tree' : 'default',
        }
        : flowDefinitionInput
          ? {
            nodes: Array.isArray(flowDefinitionInput.nodes)
              ? (flowDefinitionInput.nodes as Array<Record<string, unknown>>)
              : [],
            edges: Array.isArray(flowDefinitionInput.edges)
              ? (flowDefinitionInput.edges as Array<Record<string, unknown>>)
              : [],
            viewport:
              flowDefinitionInput.viewport &&
                typeof flowDefinitionInput.viewport === 'object' &&
                !Array.isArray(flowDefinitionInput.viewport)
                ? (flowDefinitionInput.viewport as Record<string, unknown>)
                : undefined,
            flowMode: flowDefinitionInput.flowMode === 'tree' ? 'tree' : 'default',
          }
          : undefined,
  }
}

function resolveFlowContextSummary(context: unknown): {
  flowContext: FlowContextSummary | null
  source: 'taskflow' | 'flowContext' | 'none'
} {
  const selected = resolveTaskflowContextSource(context)
  const parsed = toFlowContextSummary(selected.value)
  return {
    flowContext: parsed,
    source: parsed ? selected.source : 'none',
  }
}

function normalizeNameKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

function matchesStepName(step: LinearTaskflowStep, target: string): boolean {
  const needle = normalizeNameKey(target)
  if (!needle) return false

  const candidates = [step.label, step.contentName, step.taskName]
    .map((value) => normalizeNameKey(value))
    .filter(Boolean)

  return candidates.includes(needle)
}

function toStepFromFlowNode(node: Record<string, unknown>): LinearTaskflowStep | null {
  const data = node.data && typeof node.data === 'object' && !Array.isArray(node.data)
    ? (node.data as Record<string, unknown>)
    : {}

  const label = normalizeNameToken(data.label ?? data.contentName ?? data.taskName)
  if (!label) return null

  const taskIdRaw = Number(data.taskId)
  const contentIdRaw = Number(data.contentId)

  return {
    label,
    taskName: normalizeNameToken(data.taskName) || undefined,
    contentName: normalizeNameToken(data.contentName) || undefined,
    taskType: normalizeNameToken(data.taskType) || undefined,
    taskId: Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? taskIdRaw : undefined,
    contentId: Number.isFinite(contentIdRaw) && contentIdRaw > 0 ? contentIdRaw : undefined,
    properties:
      data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)
        ? (data.properties as Record<string, unknown>)
        : undefined,
  }
}

function sortNodesForLinearOrder(nodes: Array<Record<string, unknown>>, edges: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  for (const node of nodes) {
    map.set(String(node.id ?? ''), node)
  }

  const outs = new Map<string, string[]>()
  for (const edge of edges) {
    const source = String(edge.source ?? '')
    const target = String(edge.target ?? '')
    if (!map.has(source) || !map.has(target)) continue
    const list = outs.get(source) ?? []
    list.push(target)
    outs.set(source, list)
  }

  const ordered: Array<Record<string, unknown>> = []
  const used = new Set<string>()
  let cursor = 'start'

  while (!used.has(cursor)) {
    used.add(cursor)
    const nexts = outs.get(cursor) ?? []
    if (nexts.length !== 1) break
    const nextId = String(nexts[0])
    if (nextId === 'start' || used.has(nextId)) break
    const node = map.get(nextId)
    if (!node) break
    ordered.push(node)
    cursor = nextId
  }

  const rest = nodes
    .filter((node) => !used.has(String(node.id ?? '')))
    .slice()
    .sort((a, b) => {
      const ax = Number((a.position as Record<string, unknown> | undefined)?.x ?? 0)
      const bx = Number((b.position as Record<string, unknown> | undefined)?.x ?? 0)
      if (ax !== bx) return ax - bx
      const ay = Number((a.position as Record<string, unknown> | undefined)?.y ?? 0)
      const by = Number((b.position as Record<string, unknown> | undefined)?.y ?? 0)
      return ay - by
    })

  return [...ordered, ...rest]
}

function applyEditToSteps(
  baseSteps: LinearTaskflowStep[],
  removeByName: string[],
  insertAfter: LinearTaskflowInsertAfter[],
): LinearTaskflowStep[] {
  let nextSteps = [...baseSteps]

  if (removeByName.length > 0) {
    nextSteps = nextSteps.filter((step) => !removeByName.some((name) => matchesStepName(step, name)))
  }

  for (const insert of insertAfter) {
    const after = normalizeNameToken(insert.after)
    const step = insert.step
    if (!step?.label) continue

    if (!after) {
      nextSteps.push(step)
      continue
    }

    const anchorIndex = nextSteps.findIndex((item) => matchesStepName(item, after))
    if (anchorIndex >= 0) {
      nextSteps.splice(anchorIndex + 1, 0, step)
    } else {
      nextSteps.push(step)
    }
  }

  return nextSteps
}

function pickTaskContentByStep(
  taskContents: FlowContextTaskContentSummary[],
  step: LinearTaskflowStep,
): FlowContextTaskContentSummary | null {
  const labelKey = normalizeNameKey(step.label)
  if (!labelKey) return null

  let candidates = taskContents.filter((item) => {
    const itemLabel = normalizeNameKey(item.label)
    const itemContentName = normalizeNameKey(item.contentName)
    return itemLabel === labelKey || itemContentName === labelKey
  })

  if (candidates.length === 0) return null

  if (step.taskName) {
    const taskNameKey = normalizeNameKey(step.taskName)
    const narrowed = candidates.filter((item) => normalizeNameKey(item.taskName) === taskNameKey)
    if (narrowed.length > 0) candidates = narrowed
  }

  const contentFirst = candidates
    .slice()
    .sort((a, b) => {
      const ak = normalizeNameKey(a.kind)
      const bk = normalizeNameKey(b.kind)
      const aScore = ak === 'contentnode' ? 0 : 1
      const bScore = bk === 'contentnode' ? 0 : 1
      if (aScore !== bScore) return aScore - bScore
      const at = Number(a.taskId ?? 0)
      const bt = Number(b.taskId ?? 0)
      if (at !== bt) return at - bt
      const ac = Number(a.contentId ?? 0)
      const bc = Number(b.contentId ?? 0)
      return ac - bc
    })

  return contentFirst[0] ?? null
}

function pickTaskByStep(
  taskList: FlowContextTaskSummary[],
  step: LinearTaskflowStep,
): FlowContextTaskSummary | null {
  const labelKey = normalizeNameKey(step.label)
  const taskNameKey = normalizeNameKey(step.taskName)
  const taskId = Number(step.taskId ?? 0)

  let candidates = taskList.filter((item) => {
    if (taskId > 0 && Number(item.taskId ?? 0) !== taskId) return false

    const itemLabel = normalizeNameKey(item.label)
    const itemTaskName = normalizeNameKey(item.taskName)
    if (taskNameKey) {
      return itemTaskName === taskNameKey || itemLabel === taskNameKey
    }

    return itemLabel === labelKey || itemTaskName === labelKey
  })

  if (candidates.length === 0) return null

  if (taskNameKey) {
    const narrowed = candidates.filter((item) => normalizeNameKey(item.taskName) === taskNameKey)
    if (narrowed.length > 0) candidates = narrowed
  }

  return candidates
    .slice()
    .sort((a, b) => {
      const ak = normalizeNameKey(a.taskName)
      const bk = normalizeNameKey(b.taskName)
      const aExact = taskNameKey ? Number(ak === taskNameKey) : Number(ak === labelKey)
      const bExact = taskNameKey ? Number(bk === taskNameKey) : Number(bk === labelKey)
      if (aExact !== bExact) return bExact - aExact

      const al = normalizeNameKey(a.label)
      const bl = normalizeNameKey(b.label)
      const aLabelExact = Number(al === labelKey)
      const bLabelExact = Number(bl === labelKey)
      if (aLabelExact !== bLabelExact) return bLabelExact - aLabelExact

      return Number(a.taskId ?? 0) - Number(b.taskId ?? 0)
    })[0] ?? null
}

function pickTaskCandidateByStep(
  taskContents: FlowContextTaskContentSummary[],
  taskList: FlowContextTaskSummary[],
  step: LinearTaskflowStep,
): FlowContextTaskCandidate | null {
  return pickTaskContentByStep(taskContents, step) ?? pickTaskByStep(taskList, step)
}

function hydrateStepByFlowContext(
  logger: ComposeToolDeps['logger'],
  step: LinearTaskflowStep,
  taskList: FlowContextTaskSummary[],
  taskContents: FlowContextTaskContentSummary[],
): LinearTaskflowStep {
  if (!step?.label) return step
  if (taskContents.length === 0 && taskList.length === 0) return step

  const matched = pickTaskCandidateByStep(taskContents, taskList, step)
  if (!matched) {
    logger.log(
      `[compose_linear_taskflow][taskContents-match] miss label=${step.label} taskName=${step.taskName ?? '-'} contentName=${step.contentName ?? '-'} candidateCount=${taskContents.length + taskList.length}`,
    )
    return step
  }

  logger.log(
    `[compose_linear_taskflow][taskContents-match] hit label=${step.label} matchedTaskId=${matched.taskId ?? '-'} matchedTaskName=${matched.taskName ?? '-'} matchedContentId=${matched.contentId ?? '-'} matchedContentName=${matched.contentName ?? '-'} matchedKind=${matched.kind ?? '-'}`,
  )

  const matchedKind = normalizeNameKey(matched.kind)
  const inferredTaskType = matchedKind === 'controltasknode' ? 'CONTROL' : 'ACTION'

  return {
    ...step,
    label: normalizeNameToken(matched.label ?? matched.contentName ?? step.label) || step.label,
    taskName: step.taskName ?? matched.taskName,
    contentName: step.contentName ?? matched.contentName,
    taskId: step.taskId ?? matched.taskId,
    contentId: step.contentId ?? matched.contentId,
    taskType: step.taskType ?? inferredTaskType,
  }
}

function toPositionValue(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function resolveLinearAppendAnchor(
  nonStartNodes: Array<Record<string, unknown>>,
  edges: Array<Record<string, unknown>>,
  fallbackStartX: number,
  fallbackStartY: number,
): { nodeId: string; x: number; y: number } {
  if (nonStartNodes.length === 0) {
    return { nodeId: 'start', x: fallbackStartX, y: fallbackStartY }
  }

  const outgoingSources = new Set(
    edges
      .map((edge) => String(edge?.source ?? '').trim())
      .filter(Boolean),
  )

  const tailCandidates = nonStartNodes.filter((node) => {
    const id = String(node?.id ?? '').trim()
    return Boolean(id) && !outgoingSources.has(id)
  })

  const pool = tailCandidates.length > 0 ? tailCandidates : nonStartNodes

  const chosen = pool.reduce<Record<string, unknown> | null>((best, node) => {
    if (!best) return node

    const bestPos = (best.position as Record<string, unknown> | undefined) ?? {}
    const nodePos = (node.position as Record<string, unknown> | undefined) ?? {}
    const bestX = toPositionValue(bestPos.x)
    const nodeX = toPositionValue(nodePos.x)
    if (nodeX !== bestX) return nodeX > bestX ? node : best

    const bestY = toPositionValue(bestPos.y)
    const nodeY = toPositionValue(nodePos.y)
    return nodeY >= bestY ? node : best
  }, null)

  const chosenId = String(chosen?.id ?? '').trim()
  const chosenPos = (chosen?.position as Record<string, unknown> | undefined) ?? {}
  return {
    nodeId: chosenId || 'start',
    x: toPositionValue(chosenPos.x),
    y: toPositionValue(chosenPos.y),
  }
}

function buildLinearFlowDraftFromSteps(
  logger: ComposeToolDeps['logger'],
  flowContext: FlowContextSummary,
  steps: LinearTaskflowStep[],
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const fullFlow = flowContext.fullFlow
  if (!fullFlow || steps.length === 0) return null

  const fullFlowNodes = Array.isArray(fullFlow.nodes) ? fullFlow.nodes : []
  const existingNodes = fullFlowNodes.filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow.edges) ? fullFlow.edges : []

  const startNode = fullFlowNodes.find((node) => String(node.id ?? '') === 'start')
  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const gapX = 140
  const taskList = Array.isArray(flowContext.taskList) ? flowContext.taskList : []
  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []

  if (taskContents.length === 0 && taskList.length === 0) {
    logger.log('[compose_linear_taskflow][taskContents-guard] blocked reason=taskContents/taskList가 비어 있어 단계 매핑을 수행할 수 없음')
    return null
  }

  const unresolved = steps.find((step) => !pickTaskCandidateByStep(taskContents, taskList, step))
  if (unresolved) {
    logger.log(
      `[compose_linear_taskflow][taskContents-guard] blocked reason=taskContents/taskList에서 단계를 찾지 못함 label=${unresolved.label} taskName=${unresolved.taskName ?? '-'} contentName=${unresolved.contentName ?? '-'}`,
    )
    return null
  }

  const appendAnchor = resolveLinearAppendAnchor(existingNodes, existingEdges, startX, startY)
  const baseX = appendAnchor.x + gapX
  const baseY = appendAnchor.y

  const nextNodes: Array<Record<string, unknown>> = []
  const seed = Date.now()

  for (let i = 0; i < steps.length; i += 1) {
    const step = hydrateStepByFlowContext(logger, steps[i], taskList, taskContents)

    nextNodes.push({
      id: `ai-${seed}-${i}`,
      type: 'taskNode',
      position: { x: baseX + i * gapX, y: baseY },
      data: {
      label: step.label,
      taskName: step.taskName ?? step.label,
      taskType: step.taskType ?? 'ACTION',
      ...(step.contentName ? { contentName: step.contentName } : {}),
      ...(step.taskId ? { taskId: step.taskId } : {}),
      ...(step.contentId ? { contentId: step.contentId } : {}),
      properties: { ...(step.properties ?? {}) },
      },
    })
  }

  const nextEdges: Array<Record<string, unknown>> = nextNodes.map((node, index) => {
    const source = index === 0 ? appendAnchor.nodeId : String(nextNodes[index - 1]?.id ?? '')
    const target = String(node.id ?? '')
    return {
      id: `ai-edge-${seed}-${index}`,
      source,
      target,
      sourceHandle: 'right',
      targetHandle: 'left',
      data: {
        sourceNodeId: source,
        targetNodeId: target,
        sourceHandleId: 'right',
        targetHandleId: 'left',
        edgeType: 'straight',
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 10,
        height: 10,
        color: '#94a3b8',
      },
      style: {
        stroke: '#94a3b8',
        strokeWidth: 1.25,
      },
    }
  })

  const ensuredStartNode = startNode
    ? { ...startNode }
    : {
      id: 'start',
      type: 'startNode',
      position: { x: startX, y: startY },
      data: {
        label: 'Start',
      },
    }

  return {
    mode: 'replace',
    layout: 'linear',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow.flowMode === 'tree' ? 'tree' : 'default'),
    nodes: [ensuredStartNode, ...existingNodes.map((node) => ({ ...node })), ...nextNodes],
    edges: [...existingEdges.map((edge) => ({ ...edge })), ...nextEdges],
    viewport: fullFlow.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function buildReplacedDraftFromFullFlow(
  logger: ComposeToolDeps['logger'],
  flowContext: FlowContextSummary,
  removeByName: string[],
  insertAfter: LinearTaskflowInsertAfter[],
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const fullFlow = flowContext.fullFlow
  if (!fullFlow) return null

  const existingNodes = (Array.isArray(fullFlow.nodes) ? fullFlow.nodes : [])
    .filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow.edges) ? fullFlow.edges : []
  if (existingNodes.length === 0) return null

  const orderedNodes = sortNodesForLinearOrder(existingNodes, existingEdges)
  const baseSteps = orderedNodes
    .map((node) => toStepFromFlowNode(node))
    .filter((step): step is LinearTaskflowStep => Boolean(step))
  if (baseSteps.length === 0) return null

  const nextSteps = applyEditToSteps(baseSteps, removeByName, insertAfter)
  if (nextSteps.length === 0) return null

  return buildLinearFlowDraftFromSteps(logger, flowContext, nextSteps, flowMode)
}

function normalizeMessageKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function isControlTaskContent(item: FlowContextTaskContentSummary): boolean {
  return normalizeNameKey(item.kind) === 'controltasknode'
}

function isContentTaskContent(item: FlowContextTaskContentSummary): boolean {
  return normalizeNameKey(item.kind) === 'contentnode'
}

function resolveControlTaskContentCandidate(
  taskContents: FlowContextTaskContentSummary[],
  wantedName: unknown,
  fallbackName?: unknown,
): FlowContextTaskContentSummary | null {
  const controlCandidates = taskContents.filter((item) => isControlTaskContent(item))
  if (controlCandidates.length === 0) return null

  const wanted = normalizeNameKey(wantedName)
  const fallback = normalizeNameKey(fallbackName)

  const pickBy = (needle: string) => controlCandidates.find((item) => {
    const taskName = normalizeNameKey(item.taskName)
    const label = normalizeNameKey(item.label)
    return Boolean(needle) && (taskName.includes(needle) || label.includes(needle) || needle.includes(taskName))
  })

  return pickBy(wanted) ?? pickBy(fallback) ?? controlCandidates[0] ?? null
}


export {
  type ComposeToolDeps,
  type FlowContextSummary,
  type FlowContextTaskContentSummary,
  type LinearTaskflowDraftPlan,
  type LinearTaskflowStep,
  buildLinearFlowDraftFromSteps,
  buildReplacedDraftFromFullFlow,
  inferLinearStepsFromMessage,
  isContentTaskContent,
  normalizeMessageKey,
  normalizeNameKey,
  normalizeNameToken,
  pickTaskByStep,
  pickTaskCandidateByStep,
  pickTaskContentByStep,
  resolveControlTaskContentCandidate,
  resolveFlowContextSummary,
  toFlowContextSummary,
  toLinearTaskflowStep,
}
