import type { ToolDefinition } from './tool.type'
import { queryEvents } from '../screens/robot/ailog-event.datatools'
import { navigateToScreen } from '../screens/common/navigation.actiontools'
import { getPromptStore } from '../db/prompt-store.service'
import { Logger } from '@nestjs/common'
import { ChatScreenToolEntity } from '../db/chat-screen-tool.entity'
import { fetchWithTimeout, safeJsonParse } from '../utils/utils'
import { resolveTaskflowContextSource } from './taskflow-context-source.util'

const logger = new Logger('ScreenRegistry')

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

export type ScreenConfig = {
  /** currentApp::currentPath. handleXxx 의 routeKey 와 동일. */
  key: string
  /** 앱 키(예: robot, ota, cms, tms). */
  appKey: string
  /** 화면 표시명(프롬프트/로그용). */
  screenName: string
  /** 인텐트 분류기에 주는 화면별 추가 힌트. */
  intentHints?: string
  /** RAG 컬렉션 키(rag.docs). info 인텐트에서 사용. */
  ragCollection: string
  /** data 인텐트 tool 목록. */
  dataTools: ToolDefinition[]
  /** action 인텐트 tool 목록. */
  actionTools: ToolDefinition[]
  /** data/action agent 의 system 프롬프트. */
  dataSystemPrompt: string
  actionSystemPrompt: string
  /** 인텐트별 chat_action 값(프론트 분기용). */
  chatActions: { info: string; data: string; action: string }
  /** 근거/데이터가 없을 때 공통 폴백 문구. */
  fallbackText: string
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

function inferLinearStepsFromMessage(value: unknown): LinearTaskflowStep[] {
  const message = String(value ?? '').trim()
  if (!message) return []

  const cleaned = message
    .replace(/["'`]/g, '')
    .replace(/태스크플로우|구성해줘|구성해 줘|만들어줘|만들어 줘|직선|단순/gi, '')
    .trim()

  const fromTo = cleaned.match(/(.+?)에서\s+(.+?)로\s*(이동|가|가는|진행)?/)
  if (fromTo) {
    const from = String(fromTo[1] ?? '').trim()
    const to = String(fromTo[2] ?? '').trim()
    return [from, to].map((label) => ({ label, taskName: 'MoveTo' })).filter((step) => Boolean(step.label))
  }

  const parts = cleaned
    .split(/(?:->|→|\s+다음\s+|\s+그리고\s+|,)/)
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.map((label) => ({ label }))
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
      const id = String(node.id ?? '').trim()
      const label = normalizeNameToken(node.label)
      if (!id && !label) return acc

      acc.push({
        id: id || undefined,
        label: label || (id === 'start' ? 'start' : undefined),
        nodeType: normalizeNameToken(node.nodeType ?? node.type) || undefined,
        taskName: normalizeNameToken(node.taskName) || undefined,
        contentName: normalizeNameToken(node.contentName) || undefined,
      })
      return acc
    }, [])
    : []

  const taskList: FlowContextTaskSummary[] = Array.isArray(row.taskList)
    ? row.taskList.reduce<FlowContextTaskSummary[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const task = item as Record<string, unknown>
      const label = normalizeNameToken(task.label)
      const taskId = Number(task.taskId)
      if (!label || !Number.isFinite(taskId) || taskId <= 0) return acc

      acc.push({
        taskId,
        label,
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
      const rowItem = item as Record<string, unknown>
      const taskId = Number(rowItem.taskId)
      const label = normalizeNameToken(rowItem.label)
      if (!Number.isFinite(taskId) || taskId <= 0 || !label) return acc

      const contentIdRaw = Number(rowItem.contentId)
      const contentId = Number.isFinite(contentIdRaw) && contentIdRaw > 0 ? contentIdRaw : undefined

      acc.push({
        taskId,
        taskName: normalizeNameToken(rowItem.taskName) || undefined,
        label,
        kind: normalizeNameToken(rowItem.kind) || undefined,
        contentId,
        contentName: normalizeNameToken(rowItem.contentName) || undefined,
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

function hydrateStepByTaskContents(
  step: LinearTaskflowStep,
  taskContents: FlowContextTaskContentSummary[],
): LinearTaskflowStep {
  if (!step?.label) return step
  if (taskContents.length === 0) return step

  const matched = pickTaskContentByStep(taskContents, step)
  if (!matched) {
    logger.log(
      `[compose_linear_taskflow][taskContents-match] miss label=${step.label} taskName=${step.taskName ?? '-'} contentName=${step.contentName ?? '-'} candidateCount=${taskContents.length}`,
    )
    return step
  }

  logger.log(
    `[compose_linear_taskflow][taskContents-match] hit label=${step.label} matchedTaskId=${matched.taskId ?? '-'} matchedTaskName=${matched.taskName ?? '-'} matchedContentId=${matched.contentId ?? '-'} matchedContentName=${matched.contentName ?? '-'} matchedKind=${matched.kind ?? '-'}`,
  )

  return {
    ...step,
    taskName: step.taskName ?? matched.taskName,
    contentName: step.contentName ?? matched.contentName ?? matched.label,
    taskId: step.taskId ?? matched.taskId,
    contentId: step.contentId ?? matched.contentId,
  }
}

function buildLinearFlowDraftFromSteps(
  flowContext: FlowContextSummary,
  steps: LinearTaskflowStep[],
  flowMode?: 'default' | 'tree',
): Record<string, unknown> | null {
  const fullFlow = flowContext.fullFlow
  if (!fullFlow || steps.length === 0) return null

  const existingNodes = (Array.isArray(fullFlow.nodes) ? fullFlow.nodes : [])
    .filter((node) => String(node.id ?? '') !== 'start')
  const existingEdges = Array.isArray(fullFlow.edges) ? fullFlow.edges : []
  const orderedNodes = sortNodesForLinearOrder(existingNodes, existingEdges)

  const startNode = (Array.isArray(fullFlow.nodes) ? fullFlow.nodes : []).find((node) => String(node.id ?? '') === 'start')
  const startX = Number((startNode?.position as Record<string, unknown> | undefined)?.x ?? 0)
  const startY = Number((startNode?.position as Record<string, unknown> | undefined)?.y ?? 0)
  const baseX = startX + 150
  const baseY = startY
  const gapX = 140
  const taskContents = Array.isArray(flowContext.taskContents) ? flowContext.taskContents : []

  const usedExisting = new Set<string>()
  const nextNodes: Array<Record<string, unknown>> = []

  for (let i = 0; i < steps.length; i += 1) {
    const step = hydrateStepByTaskContents(steps[i], taskContents)
    const matched = orderedNodes.find((node) => {
      const id = String(node.id ?? '')
      if (!id || usedExisting.has(id)) return false
      const fromNode = toStepFromFlowNode(node)
      if (!fromNode) return false
      return matchesStepName(fromNode, step.label)
    })

    const reused: Record<string, unknown> = matched
      ? {
        ...matched,
      }
      : {
        id: `ai-${Date.now()}-${i}`,
        type: 'taskNode',
        data: {
          label: step.label,
          taskName: step.taskName ?? step.label,
          taskType: step.taskType ?? 'ACTION',
          ...(step.contentName ? { contentName: step.contentName } : {}),
          ...(step.taskId ? { taskId: step.taskId } : {}),
          ...(step.contentId ? { contentId: step.contentId } : {}),
          properties: { ...(step.properties ?? {}) },
        },
      }

    const reusedId = String(reused.id ?? '')
    if (reusedId) usedExisting.add(reusedId)

    const data = reused.data && typeof reused.data === 'object' && !Array.isArray(reused.data)
      ? { ...(reused.data as Record<string, unknown>) }
      : {}
    const dataProperties = data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties)
      ? (data.properties as Record<string, unknown>)
      : {}

    reused.position = { x: baseX + i * gapX, y: baseY }
    reused.data = {
      ...data,
      label: step.label,
      taskName: step.taskName ?? String(data.taskName ?? ''),
      contentName: step.contentName ?? (String(data.contentName ?? '') || undefined),
      taskType: step.taskType ?? String(data.taskType ?? 'ACTION'),
      ...(step.taskId ? { taskId: step.taskId } : {}),
      ...(step.contentId ? { contentId: step.contentId } : {}),
      ...(step.properties ? { properties: { ...dataProperties, ...step.properties } } : {}),
    }

    nextNodes.push(reused)
  }

  const nextEdges: Array<Record<string, unknown>> = nextNodes.map((node, index) => {
    const source = index === 0 ? 'start' : String(nextNodes[index - 1]?.id ?? '')
    const target = String(node.id ?? '')
    return {
      id: `ai-edge-${Date.now()}-${index}`,
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

  const nodesWithStart = startNode
    ? [startNode, ...nextNodes]
    : [
      {
        id: 'start',
        type: 'startNode',
        position: { x: startX, y: startY },
        data: {
          label: 'Start',
        },
      },
      ...nextNodes,
    ]

  return {
    mode: 'replace',
    layout: 'linear',
    flowMode: flowMode === 'tree' ? 'tree' : (fullFlow.flowMode === 'tree' ? 'tree' : 'default'),
    nodes: nodesWithStart,
    edges: nextEdges,
    viewport: fullFlow.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

function buildReplacedDraftFromFullFlow(
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

  return buildLinearFlowDraftFromSteps(flowContext, nextSteps, flowMode)
}

type ControlExampleKind = 'or' | 'parallel' | 'ifthenelse' | 'repeat' | 'ifthen'

function controlExampleDisplayName(kind: ControlExampleKind): string {
  switch (kind) {
    case 'or':
      return 'OR'
    case 'parallel':
      return 'Parallel'
    case 'ifthenelse':
      return 'IfThenElse'
    case 'repeat':
      return 'Repeat'
    case 'ifthen':
      return 'IfThen'
    default:
      return 'Control'
  }
}

function detectControlExampleKind(message: string): ControlExampleKind | null {
  const text = String(message ?? '').trim()
  if (!text) return null
  const asksExample = /(예시|샘플|사례|보여|구성)/i.test(text)
  if (!asksExample) return null

  if (/(if\s*then\s*else|ifthenelse|if-then-else|조건\s*분기)/i.test(text)) return 'ifthenelse'
  if (/(parallel|병렬)/i.test(text)) return 'parallel'
  if (/(repeat|반복)/i.test(text)) return 'repeat'
  if (/(if\s*then|ifthen|if-then|조건\s*노드)/i.test(text)) return 'ifthen'
  if (/(or\s*노드|\bor\b|오알|오아르|오어)/i.test(text)) return 'or'

  return null
}

function matchControlKind(taskNameOrLabel: string, kind: ControlExampleKind): boolean {
  const key = normalizeNameKey(taskNameOrLabel)
  if (!key) return false

  if (kind === 'ifthenelse') {
    return key.includes('ifthenelse') || key.includes('ifelse') || key.includes('조건분기')
  }
  if (kind === 'parallel') {
    return key.includes('parallel') || key.includes('병렬')
  }
  if (kind === 'repeat') {
    return key.includes('repeat') || key.includes('반복')
  }
  if (kind === 'ifthen') {
    return key.includes('ifthen') || key.includes('조건')
  }
  return key.includes('or') || key.includes('오알') || key.includes('오아르') || key.includes('오어')
}

function buildControlExampleDraft(
  flowContext: FlowContextSummary | null,
  controlKind: ControlExampleKind,
): Record<string, unknown> | null {
  const taskContents = Array.isArray(flowContext?.taskContents) ? flowContext.taskContents : []
  if (taskContents.length === 0) return null

  const control = taskContents.find((item) => {
    const itemKind = normalizeNameKey(item.kind)
    return itemKind === 'controltasknode' && (
      matchControlKind(String(item.label ?? ''), controlKind) ||
      matchControlKind(String(item.taskName ?? ''), controlKind)
    )
  })
  if (!control) return null

  const contentCandidates = taskContents.filter((item) => normalizeNameKey(item.kind) === 'contentnode')
  const first = contentCandidates[0]
  const second = contentCandidates.find((item) => item !== first)
  if (!first) return null
  if ((controlKind === 'or' || controlKind === 'parallel' || controlKind === 'ifthenelse') && !second) return null

  const seed = Date.now()
  const controlNodeId = `ai-${controlKind}-${seed}`
  const aId = `ai-branch-a-${seed}`
  const bId = `ai-branch-b-${seed}`

  const buildEdge = (id: string, source: string, target: string) => ({
    id,
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
  })

  return {
    mode: 'replace',
    layout: 'manual',
    flowMode: 'default',
    nodes: (() => {
      const commonNodes: Array<Record<string, unknown>> = [
        {
          id: 'start',
          type: 'startNode',
          position: { x: 0, y: 0 },
          data: { label: 'Start' },
        },
        {
          id: controlNodeId,
          type: 'taskNode',
          position: { x: 180, y: 0 },
          data: {
            label: control.label ?? control.taskName ?? controlExampleDisplayName(controlKind),
            taskId: control.taskId,
            taskName: control.taskName,
            taskType: 'CONTROL',
          },
        },
      ]

      if (controlKind === 'repeat' || controlKind === 'ifthen') {
        commonNodes.push({
          id: aId,
          type: 'taskNode',
          position: { x: 380, y: 0 },
          data: {
            label: first.label,
            taskId: first.taskId,
            taskName: first.taskName,
            taskType: 'ACTION',
            contentId: first.contentId,
            contentName: first.contentName ?? first.label,
          },
        })
        return commonNodes
      }

      commonNodes.push(
        {
          id: aId,
          type: 'taskNode',
          position: { x: 380, y: -100 },
          data: {
            label: first.label,
            taskId: first.taskId,
            taskName: first.taskName,
            taskType: 'ACTION',
            contentId: first.contentId,
            contentName: first.contentName ?? first.label,
          },
        },
        {
          id: bId,
          type: 'taskNode',
          position: { x: 380, y: 100 },
          data: {
            label: second?.label,
            taskId: second?.taskId,
            taskName: second?.taskName,
            taskType: 'ACTION',
            contentId: second?.contentId,
            contentName: second?.contentName ?? second?.label,
          },
        },
      )
      return commonNodes
    })(),
    edges: (() => {
      const base = [buildEdge(`ai-edge-${seed}-1`, 'start', controlNodeId)]

      if (controlKind === 'repeat' || controlKind === 'ifthen') {
        base.push(buildEdge(`ai-edge-${seed}-2`, controlNodeId, aId))
        return base
      }

      base.push(
        buildEdge(`ai-edge-${seed}-2`, controlNodeId, aId),
        buildEdge(`ai-edge-${seed}-3`, controlNodeId, bId),
      )
      return base
    })(),
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

function resolveAppendAnchorFromFlowContext(flowContext: FlowContextSummary | null): string {
  if (!flowContext) return ''
  if (flowContext.ambiguousInsertion) return ''

  if (Array.isArray(flowContext.tails) && flowContext.tails.length === 1) {
    return normalizeNameToken(flowContext.tails[0])
  }

  const linearOrder = Array.isArray(flowContext.linearOrder) ? flowContext.linearOrder : []
  if (linearOrder.length > 0) {
    return normalizeNameToken(linearOrder[linearOrder.length - 1])
  }

  return ''
}

function inferLinearDraftPlanFromMessage(value: unknown, flowContext: FlowContextSummary | null = null): LinearTaskflowDraftPlan {
  const message = String(value ?? '').trim()
  if (!message) return { mode: 'replace', steps: [] }

  const cleaned = message.replace(/["'`]/g, '').trim()
  const clauses = cleaned
    .split(/[\n.?!]|(?:,\s*)/)
    .map((part) => part.trim())
    .filter(Boolean)

  const removeByName: string[] = []
  const insertAfter: LinearTaskflowInsertAfter[] = []

  for (const clause of clauses) {
    const deleteMatch = clause.match(/(.+?)\s*노드(?:는|를|은|을)?\s*(?:지워줘|지워|삭제해줘|삭제해|삭제|없애줘|없애|제거해줘|제거해|제거)/i)
    if (deleteMatch) {
      const target = normalizeNameToken(deleteMatch[1])
      if (target) removeByName.push(target)
      continue
    }

    const insertMatch = clause.match(/(.+?)\s*이후에\s*(.+?)\s*(?:으로|로)?\s*(?:이동해줘|이동|가줘|가게\s*해줘|추가해줘|추가|넣어줘)/i)
    if (insertMatch) {
      const after = normalizeNameToken(insertMatch[1])
      const destination = normalizeNameToken(insertMatch[2])
      if (!after || !destination) continue

      insertAfter.push({
        after,
        step: {
          label: destination,
          taskName: 'MoveTo',
          contentName: destination,
        },
      })
      continue
    }

    const anchoredAddMatch = clause.match(/(.+?)\s*(?:에|뒤에|다음에)\s*(.+?)\s*(?:노드)?\s*(?:추가해줘|추가|넣어줘|붙여줘)/i)
    if (anchoredAddMatch) {
      const after = normalizeNameToken(anchoredAddMatch[1])
      const destination = normalizeNameToken(anchoredAddMatch[2])
      if (!after || !destination) continue

      insertAfter.push({
        after,
        step: {
          label: destination,
          taskName: 'MoveTo',
          contentName: destination,
        },
      })
      continue
    }

    const destinationAnchorMatch = clause.match(/(.+?)\s*노드(?:를|을)?\s*(.+?)\s*노드(?:에|뒤에|다음에)\s*(?:추가해줘|추가|넣어줘|붙여줘)/i)
    if (destinationAnchorMatch) {
      const destination = normalizeNameToken(destinationAnchorMatch[1])
      const after = normalizeNameToken(destinationAnchorMatch[2])
      if (!after || !destination) continue

      insertAfter.push({
        after,
        step: {
          label: destination,
          taskName: 'MoveTo',
          contentName: destination,
        },
      })
      continue
    }

    const plainAddMatch = clause.match(/(.+?)\s*(?:을|를)?\s*(?:추가해줘|추가|넣어줘|붙여줘)/i)
    if (plainAddMatch) {
      const destination = normalizeNameToken(plainAddMatch[1])
      if (!destination) continue
      const anchor = resolveAppendAnchorFromFlowContext(flowContext)

      insertAfter.push({
        after: anchor,
        step: {
          label: destination,
          taskName: 'MoveTo',
          contentName: destination,
        },
      })
      continue
    }

    const appendMatch = clause.match(/(.+?)\s*노드(?:를|가|는|은|하나|한개)?\s*(?:추가해줘|추가|넣어줘|붙여줘)/i)
    if (appendMatch) {
      const destination = normalizeNameToken(appendMatch[1])
      if (!destination) continue
      const anchor = resolveAppendAnchorFromFlowContext(flowContext)

      insertAfter.push({
        after: anchor,
        step: {
          label: destination,
          taskName: 'MoveTo',
          contentName: destination,
        },
      })
      continue
    }
  }

  if (removeByName.length > 0 || insertAfter.length > 0) {
    return {
      mode: 'edit',
      removeByName,
      insertAfter,
    }
  }

  return {
    mode: 'replace',
    steps: inferLinearStepsFromMessage(cleaned),
  }
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

function isAmbiguousNodeAddMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksAdd = /(노드\s*(추가|넣어|붙여)|추가해줘|넣어줘|붙여줘)/i.test(text)
  if (!asksAdd) return false
  const hasSpecific = /([^\s]+)\s*노드\s*(추가|넣어|붙여)|([^\s]+)\s*(을|를)?\s*(추가해줘|넣어줘|붙여줘)/i.test(text)
  if (!hasSpecific) return true
  const genericOnly = /(노드\s*(추가해줘|추가|넣어줘|넣어|붙여줘|붙여))$/i.test(text)
  return genericOnly
}

function isAmbiguousNodeDeleteMessage(message: string): boolean {
  const text = String(message ?? '').trim()
  if (!text) return false
  const asksDelete = /(노드\s*(지워줘|지워|삭제해줘|삭제해|삭제|제거해줘|제거해|제거|없애줘|없애)|삭제해줘|삭제해|삭제|지워줘|지워|제거해줘|제거해|제거|없애줘|없애)/i.test(text)
  if (!asksDelete) return false
  const hasSpecific = /([^\s]+)\s*노드\s*(지워줘|지워|삭제해줘|삭제해|삭제|제거해줘|제거해|제거|없애줘|없애)/i.test(text)
  return !hasSpecific
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

function buildControlExampleAssistantText(kind: ControlExampleKind): string {
  if (kind === 'parallel') {
    return 'Parallel 노드 예시를 캔버스에 추가했습니다. Parallel은 여러 작업을 동시에 시작해야 할 때 사용합니다.'
  }
  if (kind === 'ifthenelse') {
    return 'IfThenElse 노드 예시를 캔버스에 추가했습니다. 조건이 참/거짓일 때 각각 다른 경로로 분기할 수 있습니다.'
  }
  if (kind === 'repeat') {
    return 'Repeat 노드 예시를 캔버스에 추가했습니다. 특정 작업을 조건이 만족될 때까지 반복할 때 사용합니다.'
  }
  if (kind === 'ifthen') {
    return 'IfThen 노드 예시를 캔버스에 추가했습니다. 조건이 참일 때만 다음 작업을 수행하도록 구성할 수 있습니다.'
  }
  return 'OR 노드 예시를 캔버스에 추가했습니다. OR 노드는 여러 경로 중 조건에 맞는 분기를 선택할 때 사용합니다.'
}

function buildControlExampleFallbackText(kind: ControlExampleKind): string {
  if (kind === 'parallel') {
    return 'Parallel 노드 예시: Start -> Parallel -> [청소 시작, 안내 방송]. Parallel은 여러 작업을 동시에 진행해야 할 때 사용합니다.'
  }
  if (kind === 'ifthenelse') {
    return 'IfThenElse 노드 예시: Start -> IfThenElse(배터리<20%) -> [충전소 이동, 순찰 계속]. 조건 참/거짓에 따라 경로를 분기합니다.'
  }
  if (kind === 'repeat') {
    return 'Repeat 노드 예시: Start -> Repeat(3회) -> 구역 점검. 특정 횟수 또는 조건 만족 시까지 반복할 때 사용합니다.'
  }
  if (kind === 'ifthen') {
    return 'IfThen 노드 예시: Start -> IfThen(문 열림 감지) -> 경고 알림. 조건이 참일 때만 다음 작업을 수행합니다.'
  }
  return 'OR 노드 예시: Start -> OR -> [A 경로, B 경로]. OR은 여러 선택지 중 조건에 맞는 분기를 선택할 때 사용합니다.'
}

function buildTaskflowEditAssistantText(
  mode: 'replace' | 'edit',
  removeByName: string[],
  insertAfter: LinearTaskflowInsertAfter[],
): string {
  if (mode === 'edit') {
    if (removeByName.length > 0 && insertAfter.length > 0) {
      return '요청하신 노드 편집 내용을 캔버스에 반영했습니다.'
    }
    if (removeByName.length > 0) {
      return '요청하신 노드 삭제 내용을 캔버스에 반영했습니다.'
    }
    if (insertAfter.length > 0) {
      return '요청하신 노드 추가 내용을 캔버스에 반영했습니다.'
    }
  }

  return '요청하신 태스크플로우 변경을 캔버스에 반영했습니다.'
}

const composeLinearTaskflowTool: ToolDefinition = {
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
    const userMessage = String(contextRow?.__userMessage ?? '').trim()
    const { flowContext, source } = resolveFlowContextSummary(contextRow)
    if (isAmbiguousNodeAddMessage(userMessage)) {
      return {
        clarification: '어떤 노드를 추가하시겠어요? 노드 이름을 알려주세요.',
        needUserInput: true,
      }
    }

    if (isAmbiguousNodeDeleteMessage(userMessage)) {
      return {
        clarification: '어떤 노드를 삭제할까요? 노드 이름을 알려주세요.',
        needUserInput: true,
      }
    }

    if (isAmbiguousModeChangeMessage(userMessage)) {
      return {
        clarification: '가로 모드와 세로 모드 중 어떤 방향으로 바꿀까요?',
        needUserInput: true,
      }
    }

    if (isAmbiguousSaveMessage(userMessage)) {
      return {
        clarification: '임시 저장과 정식 저장 중 어떤 방식으로 저장할까요?',
        needUserInput: true,
      }
    }

    const controlExampleKind = detectControlExampleKind(userMessage)
    if (controlExampleKind) {
      const draft = buildControlExampleDraft(flowContext, controlExampleKind)
      if (!draft) {
        return {
          assistantText: buildControlExampleFallbackText(controlExampleKind),
        }
      }

      return {
        canvasDraft: draft,
        assistantText: buildControlExampleAssistantText(controlExampleKind),
      }
    }

    const requestedSave = detectSaveCommand(userMessage)
    if (requestedSave) {
      return {
        canvasCommand: {
          type: requestedSave,
        },
        assistantText: requestedSave === 'temp-save'
          ? '태스크 플로우 임시 저장을 실행합니다.'
          : '태스크 플로우 저장을 실행합니다.',
      }
    }

    const requestedMode = detectRequestedFlowMode(userMessage)
    if (requestedMode) {
      const modeDraft = buildReplacedDraftFromFullFlow(
        flowContext ?? {},
        [],
        [],
        requestedMode,
      )

      if (modeDraft) {
        return {
          canvasDraft: modeDraft,
          assistantText: requestedMode === 'tree'
            ? '세로 모드로 전환했습니다.'
            : '가로 모드로 전환했습니다.',
        }
      }
    }

    if (isAlignRequestMessage(userMessage)) {
      const alignedDraft = buildReplacedDraftFromFullFlow(
        flowContext ?? {},
        [],
        [],
        args?.flowMode === 'tree' ? 'tree' : 'default',
      )

      if (alignedDraft) {
        return {
          canvasDraft: alignedDraft,
          assistantText: '현재 노드 배치를 정렬했습니다.',
        }
      }
    }

    const reqId = String(contextRow?.__reqId ?? contextRow?.reqId ?? '').trim() || '-'
    logger.log(
      `[compose_linear_taskflow] [reqId=${reqId}] flow-context-source=${source} taskFlowId=${flowContext?.taskFlowId ?? '-'} nodeCount=${flowContext?.nodeCount ?? 0} edgeCount=${flowContext?.edgeCount ?? 0}`,
    )
    logger.log(
      `================= [2단계:컨텍스트수신_검증] [reqId=${reqId}] route=${String(contextRow?.pathname ?? contextRow?.currentPath ?? '')} source=${source} hasFlowDefinition=${Boolean(flowContext?.flowDefinition)} hasFullFlow=${Boolean(flowContext?.fullFlow)} flowDefinitionNodeCount=${Array.isArray(flowContext?.flowDefinition?.nodes) ? flowContext.flowDefinition.nodes.length : 0} flowDefinitionEdgeCount=${Array.isArray(flowContext?.flowDefinition?.edges) ? flowContext.flowDefinition.edges.length : 0} taskListCount=${Array.isArray(flowContext?.taskList) ? flowContext.taskList.length : 0} taskContentsCount=${Array.isArray(flowContext?.taskContents) ? flowContext.taskContents.length : 0}`,
    )

    const inferred = inferLinearDraftPlanFromMessage(
      contextRow?.__userMessage,
      flowContext,
    )
    const prefersEdit = inferred.mode === 'edit'
    const steps = (normalized.length > 0 ? normalized : (inferred.steps ?? [])).slice(0, 12)
    const mergedInsertAfter = (inferred.insertAfter ?? []).map((item, index) => ({
      ...item,
      step: normalized[index] ?? item.step,
    }))

    const candidateSteps: LinearTaskflowStep[] = [
      ...steps,
      ...mergedInsertAfter
        .map((item) => item.step)
        .filter((step): step is LinearTaskflowStep => Boolean(step?.label)),
    ]

    const ambiguousStep = candidateSteps.find((step) => isGenericNodePlaceholder(step.label))
    if (ambiguousStep) {
      logger.log(
        `[compose_linear_taskflow][ask-node-name] [reqId=${reqId}] label=${String(ambiguousStep.label ?? '')} candidateSteps=${JSON.stringify(candidateSteps.map((step) => ({ label: step.label, taskName: step.taskName, contentName: step.contentName })))} `,
      )
      return {
        clarification: '어떤 노드를 추가하시겠어요? 노드의 이름이나 종류를 알려주시면 추가해 드릴 수 있습니다.',
        needUserInput: true,
      }
    }

    const mode: 'replace' | 'edit' = prefersEdit ? 'edit' : 'replace'
    const fullFlowDraft = mode === 'edit'
      ? buildReplacedDraftFromFullFlow(
        flowContext ?? {},
        inferred.removeByName ?? [],
        mergedInsertAfter,
        args?.flowMode === 'tree' ? 'tree' : 'default',
      )
      : null
    const replaceFlowDraft = mode === 'replace' && flowContext
      ? buildLinearFlowDraftFromSteps(
        flowContext,
        steps,
        args?.flowMode === 'tree' ? 'tree' : 'default',
      )
      : null
    const passthroughFullFlowDraft = mode === 'replace' && flowContext?.fullFlow
      ? {
        mode: 'replace',
        layout: 'linear',
        flowMode: args?.flowMode === 'tree' ? 'tree' : (flowContext.fullFlow.flowMode === 'tree' ? 'tree' : 'default'),
        nodes: Array.isArray(flowContext.fullFlow.nodes) ? flowContext.fullFlow.nodes : [],
        edges: Array.isArray(flowContext.fullFlow.edges) ? flowContext.fullFlow.edges : [],
        viewport: flowContext.fullFlow.viewport ?? { x: 0, y: 0, zoom: 1 },
      }
      : null
    const preferredDraft = mode === 'edit'
      ? (fullFlowDraft ?? null)
      : (replaceFlowDraft ?? passthroughFullFlowDraft)

    const fallbackDraft = {
      mode,
      layout: 'linear',
      flowMode: args?.flowMode === 'tree' ? 'tree' : 'default',
      ...(mode === 'replace' ? { steps } : {}),
      ...(mode === 'edit'
        ? {
          removeByName: inferred.removeByName ?? [],
          insertAfter: mergedInsertAfter.slice(0, 12),
        }
        : {}),
    }

    const finalDraft = preferredDraft ?? fallbackDraft
    return {
      canvasDraft: finalDraft,
      assistantText: buildTaskflowEditAssistantText(
        mode,
        inferred.removeByName ?? [],
        mergedInsertAfter.slice(0, 12),
      ),
    }
  },
}

const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  query_events: queryEvents,
  compose_linear_taskflow: composeLinearTaskflowTool,
}

const DATA_TOOL_NAMES = new Set(['query_events'])

const TOOL_REGISTRY_BY_API_METHOD: Record<string, ToolDefinition> = {
  'query_events::GET': queryEvents,
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const HTTP_TIMEOUT_MS = 10_000

type ContextParamRule = {
  argKey: string
  sourcePath: string
  required?: boolean
  defaultValue?: unknown
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeContextParamRules(value: unknown): ContextParamRule[] {
  if (!Array.isArray(value)) return []

  return value
    .map<ContextParamRule | null>((item) => {
      if (typeof item === 'string') {
        const key = item.trim()
        if (!key) return null
        return {
          argKey: key,
          sourcePath: key,
        }
      }

      if (!item || typeof item !== 'object') return null

      const row = item as Record<string, unknown>
      const argKey = String(row.argKey ?? row.arg ?? row.name ?? row.key ?? '').trim()
      const sourcePath = String(row.sourcePath ?? row.from ?? row.contextKey ?? row.path ?? '').trim()
      if (!argKey || !sourcePath) return null

      return {
        argKey,
        sourcePath,
        required: Boolean(row.required),
        defaultValue: row.defaultValue ?? row.default,
      }
    })
    .filter((rule): rule is ContextParamRule => Boolean(rule))
}

function pickByPath(source: Record<string, unknown>, rawPath: string): unknown {
  const normalized = String(rawPath ?? '').trim().replace(/^context\./, '')
  if (!normalized) return undefined

  const segments = normalized.split('.').filter(Boolean)
  let cursor: unknown = source

  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }

  return cursor
}

function buildToolFromRow(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const baseTool = resolveToolDefinition(row)
  if (!baseTool) return undefined

  const contextRules = normalizeContextParamRules(row.contextParams)
  const staticPayload = toObject(row.staticPayload)

  const wrapped: ToolDefinition = {
    declaration: baseTool.declaration,
    async execute(args, ctx) {
      const nextArgs: Record<string, unknown> = {
        ...(args ?? {}),
      }

      const contextData = toObject(ctx.context)
      for (const rule of contextRules) {
        const current = nextArgs[rule.argKey]
        if (current !== undefined && current !== null && String(current).trim() !== '') continue

        let resolved = pickByPath(contextData, rule.sourcePath)
        if (resolved === undefined || resolved === null || String(resolved).trim() === '') {
          resolved = rule.defaultValue
        }

        if (resolved === undefined || resolved === null || String(resolved).trim() === '') {
          if (rule.required) {
            throw new Error(`context param missing: ${rule.sourcePath}`)
          }
          continue
        }

        nextArgs[rule.argKey] = resolved
      }

      const mergedArgs = {
        ...nextArgs,
        ...staticPayload,
      }

      return baseTool.execute(mergedArgs, ctx)
    },
  }

  return wrapped
}

function normalizePath(value: unknown): string {
  return String(value ?? '').trim().replace(/^\/+/, '')
}

function trimBase(url?: string): string {
  return String(url ?? '').trim().replace(/\/+$/, '')
}

type RequestParamLocation = 'query' | 'body' | 'header'

type RequestParamRule = {
  name: string
  location: RequestParamLocation
  required: boolean
  defaultValue?: unknown
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function toStringRecord(value: unknown): Record<string, string> {
  const source = toObject(value)
  const out: Record<string, string> = {}

  for (const [k, v] of Object.entries(source)) {
    if (!k || isBlank(v)) continue
    out[k] = String(v)
  }

  return out
}

function hasHeader(headers: Record<string, string>, key: string): boolean {
  const target = String(key ?? '').trim().toLowerCase()
  if (!target) return false
  return Object.keys(headers).some((k) => k.toLowerCase() === target)
}

function normalizeRequestSchema(value: unknown, defaultLocation: RequestParamLocation = 'body'): {
  properties: Record<string, unknown>
  required: string[]
  rules: RequestParamRule[]
} {
  if (!Array.isArray(value)) return { properties: {}, required: [], rules: [] }

  const properties: Record<string, unknown> = {}
  const required: string[] = []
  const rules: RequestParamRule[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>

    const name = String(row.name ?? row.key ?? row.argKey ?? '').trim()
    if (!name) continue

    const type = String(row.type ?? '').trim().toLowerCase()
    const schemaType = (['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(type)
      ? type
      : 'string') as 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

    const prop: Record<string, unknown> = {
      type: schemaType,
    }

    const description = String(row.description ?? '').trim()
    if (description) prop.description = description

    if (Array.isArray(row.enum) && row.enum.length > 0) {
      prop.enum = row.enum
    }

    const rawIn = String(row.in ?? row.location ?? row.target ?? '').trim().toLowerCase()
    const location: RequestParamLocation = rawIn === 'header' || rawIn === 'query' || rawIn === 'body'
      ? rawIn
      : defaultLocation
    const isRequired = Boolean(row.required)

    properties[name] = prop
    if (isRequired) required.push(name)
    rules.push({
      name,
      location,
      required: isRequired,
      defaultValue: row.defaultValue ?? row.default,
    })
  }

  return { properties, required, rules }
}

function buildHttpUrl(baseUrl: string, endpoint: string, queryParams: Record<string, unknown>): string {
  const absolute = /^https?:\/\//i.test(endpoint)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const base = absolute ? '' : baseUrl
  const url = `${base}${path}`

  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(queryParams ?? {})) {
    if (v === undefined || v === null || String(v).trim() === '') continue
    query.set(k, String(v))
  }

  const qs = query.toString()
  return qs ? `${url}?${qs}` : url
}

function getDynamicHttpTool(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const method = String(row.method ?? '').trim().toUpperCase()
  if (!HTTP_METHODS.has(method)) return undefined

  const endpoint = String(row.endpoint ?? '').trim()
  if (!endpoint) return undefined

  const toolName = String(row.toolName ?? '').trim()
  if (!toolName) return undefined

  const defaultLocation: RequestParamLocation = method === 'GET' || method === 'DELETE' ? 'query' : 'body'
  const { properties, required, rules } = normalizeRequestSchema(row.requestParams, defaultLocation)

  return {
    declaration: {
      name: toolName,
      description: String(row.description ?? '').trim() || `${method} ${endpoint} API를 호출한다.`,
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    },
    async execute(args, ctx) {
      const payload = toObject(args)
      const staticPayload = toObject(row.staticPayload)
      const baseUrlOverride = String(row.baseUrl ?? staticPayload.baseUrl ?? '').trim()
      const staticHeaders = {
        ...toStringRecord(staticPayload.headers),
        ...toStringRecord(row.requestHeaders),
      }
      const staticQuery = {
        ...toObject(staticPayload.query),
        ...toObject(row.requestQuery),
      }
      const reserved = new Set(['baseUrl', 'headers', 'query', 'body', 'useAccessToken'])
      const legacyStaticBody = Object.fromEntries(
        Object.entries(staticPayload).filter(([k]) => !reserved.has(k)),
      )
      const staticBody = {
        ...toObject(legacyStaticBody),
        ...toObject(staticPayload.body),
        ...toObject(row.requestBody),
      }

      const queryPayload: Record<string, unknown> = { ...staticQuery }
      const bodyPayload: Record<string, unknown> = { ...staticBody }
      const headerPayload: Record<string, string> = { ...staticHeaders }

      const consumed = new Set<string>()
      for (const rule of rules) {
        consumed.add(rule.name)
        let value = payload[rule.name]
        if (isBlank(value)) value = rule.defaultValue

        if (isBlank(value)) {
          if (rule.required) {
            throw new Error(`request param missing: ${rule.name}`)
          }
          continue
        }

        if (rule.location === 'header') {
          headerPayload[rule.name] = String(value)
          continue
        }

        if (rule.location === 'query') {
          queryPayload[rule.name] = value
          continue
        }

        bodyPayload[rule.name] = value
      }

      if (rules.length === 0) {
        if (method === 'GET' || method === 'DELETE') {
          Object.assign(queryPayload, payload)
        } else {
          Object.assign(bodyPayload, payload)
        }
      } else {
        for (const [k, v] of Object.entries(payload)) {
          if (consumed.has(k)) continue
          if (method === 'GET' || method === 'DELETE') {
            queryPayload[k] = v
          } else {
            bodyPayload[k] = v
          }
        }
      }

      const baseUrl = trimBase(baseUrlOverride)
      const url = buildHttpUrl(baseUrl, endpoint, queryPayload)

      if (!/^https?:\/\//i.test(url)) {
        throw new Error(`base_url is required unless endpoint is absolute URL. tool=${String(row.toolName ?? '')}`)
      }

      const headers: Record<string, string> = { ...headerPayload }
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json'
      }

      const useAccessToken = staticPayload.useAccessToken === true
      if (useAccessToken && ctx.accessToken && !hasHeader(headers, 'authorization')) {
        headers.authorization = `Bearer ${ctx.accessToken}`
      }

      const res = await fetchWithTimeout(
        url,
        {
          method,
          headers,
          ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(bodyPayload) }),
        },
        HTTP_TIMEOUT_MS,
      )

      const text = await res.text().catch(() => '')
      const json = safeJsonParse(text)

      if (!res.ok) {
        throw new Error(`dynamic tool ${res.status}: ${text.slice(0, 300)}`)
      }

      return json?.data ?? json ?? { ok: true }
    },
  }
}

function getDynamicNavigationTool(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const method = String(row.method ?? '').trim().toUpperCase()
  if (method !== 'NAVIGATE') return undefined

  const staticPayload = row.staticPayload as Record<string, unknown> | null
  const targetPath = normalizePath(staticPayload?.path ?? row.endpoint)
  if (!targetPath) return undefined

  const name = String(row.toolName ?? '').trim()
  if (!name) return undefined

  return {
    declaration: {
      name,
      description:
        String(row.description ?? '').trim() ||
        `${targetPath} 화면으로 이동시킨다. 화면 이동 요청일 때만 호출한다.`,
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: '왜 이 화면으로 이동하는지에 대한 짧은 설명.',
          },
        },
      },
    },
    async execute(args: Record<string, any>) {
      return {
        ok: true,
        path: targetPath,
        app: targetPath.split('/')[0] || undefined,
        reason: String(args?.reason ?? '').trim() || undefined,
      }
    },
  }
}

function resolveToolDefinition(row: ChatScreenToolEntity): ToolDefinition | undefined {
  const dynamicNavigationTool = getDynamicNavigationTool(row)
  if (dynamicNavigationTool) {
    return dynamicNavigationTool
  }

  // query_events 처럼 도메인 정규화가 필요한 툴은
  // 동적 HTTP보다 전용 구현을 우선 적용한다.
  const toolName = String(row.toolName ?? '').trim()
  if (toolName && TOOL_REGISTRY[toolName]) {
    return TOOL_REGISTRY[toolName]
  }

  const dynamicHttpTool = getDynamicHttpTool(row)
  if (dynamicHttpTool) {
    return dynamicHttpTool
  }

  const apiName = String(row.apiName ?? '').trim()
  const method = String(row.method ?? '').trim().toUpperCase()
  const apiMethodKey = `${apiName}::${method}`

  if (TOOL_REGISTRY_BY_API_METHOD[apiMethodKey]) {
    return TOOL_REGISTRY_BY_API_METHOD[apiMethodKey]
  }

  if (apiName && TOOL_REGISTRY[apiName]) {
    return TOOL_REGISTRY[apiName]
  }

  return undefined
}

function resolveToolKind(row: ChatScreenToolEntity, tool: ToolDefinition): 'data' | 'action' | undefined {
  const declared = String(tool?.declaration?.name ?? '').trim()
  if (DATA_TOOL_NAMES.has(declared)) return 'data'

  const kind = String(row.kind ?? '').trim().toLowerCase()
  if (kind === 'data' || kind === 'action') return kind
  return undefined
}

function toChatAction(routeKey: string) {
  const normalized = String(routeKey || '').replace(/^\//, '').replace(/^robot\//, '')
  return normalized || 'default'
}

export function getScreenConfig(routeKey: string, reqId?: string): ScreenConfig | undefined {
  const normalizedRouteKey = String(routeKey || '').replace(/^\//, '')
  if (!normalizedRouteKey) return undefined
  const resolvedReqId = String(reqId ?? '').trim() || '-'
  const appKey = normalizedRouteKey.split('/').filter(Boolean)[0] || normalizedRouteKey

  const store = getPromptStore()
  const screen = store?.getScreen(normalizedRouteKey)
  if (!screen || screen.enabled === false) {
    return undefined
  }

  const commonSystem = store?.getPromptContent('common', 'system') ?? ''
  const screenIntentHint = store?.getPromptContent(normalizedRouteKey, 'intent-hint') ?? ''
  const screenDataSystem = store?.getPromptContent(normalizedRouteKey, 'data-system') ?? ''
  const screenActionSystem = store?.getPromptContent(normalizedRouteKey, 'action-system') ?? ''
  const screenFallback = store?.getPromptContent(normalizedRouteKey, 'fallback') ?? ''

  const appIntentHint = store?.getPromptContent(appKey, 'intent-hint') ?? ''
  const appDataSystem = store?.getPromptContent(appKey, 'data-system') ?? ''
  const appActionSystem = store?.getPromptContent(appKey, 'action-system') ?? ''
  const appFallback = store?.getPromptContent(appKey, 'fallback') ?? ''

  const resolvedIntentHint = screenIntentHint || appIntentHint
  const resolvedDataSystem = screenDataSystem || appDataSystem
  const resolvedActionSystem = screenActionSystem || appActionSystem
  const resolvedFallback = screenFallback || appFallback

  const intentHintSource = screenIntentHint ? 'screen' : appIntentHint ? 'app' : 'none'
  const dataPromptSource = screenDataSystem ? 'screen' : appDataSystem ? 'app' : 'none'
  const actionPromptSource = screenActionSystem ? 'screen' : appActionSystem ? 'app' : 'none'

  const mergedDataSystemPrompt = [commonSystem, resolvedDataSystem].filter(Boolean).join('\n\n')
  const mergedActionSystemPrompt = [commonSystem, resolvedActionSystem].filter(Boolean).join('\n\n')

  const screenToolRows = store?.getScreenTools(normalizedRouteKey) ?? []
  const resolvedTools = screenToolRows
    .map((row) => {
      const tool = buildToolFromRow(row)
      if (!tool) return undefined

      const kind = resolveToolKind(row, tool)
      if (!kind) return undefined

      return { kind, tool }
    })
    .filter((item): item is { kind: 'data' | 'action'; tool: ToolDefinition } => Boolean(item))

  const dataTools = resolvedTools
    .filter((item) => item.kind === 'data')
    .map((item) => item.tool)

  const actionTools = resolvedTools
    .filter((item) => item.kind === 'action')
    .map((item) => item.tool)

  const baseAction = toChatAction(normalizedRouteKey)

  logger.log(
    [
      '================= [1단계:화면설정_프롬프트적용]',
      `[reqId=${resolvedReqId}]`,
      `route=${normalizedRouteKey}`,
      `app=${appKey}`,
      `commonSystemApplied=${Boolean(commonSystem)}`,
      `intentHintSource=${intentHintSource}`,
      `dataPromptSource=${dataPromptSource}`,
      `actionPromptSource=${actionPromptSource}`,
      `dataPromptLen=${mergedDataSystemPrompt.length}`,
      `actionPromptLen=${mergedActionSystemPrompt.length}`,
      `dataTools=${dataTools.length}`,
      `actionTools=${actionTools.length}`,
    ].join(' '),
  )
  
  logger.log(
    `================= [1-2단계:화면프롬프트_최종머지결과] [reqId=${resolvedReqId}] route=${normalizedRouteKey} mergedDataSystemPrompt=${JSON.stringify(mergedDataSystemPrompt)} mergedActionSystemPrompt=${JSON.stringify(mergedActionSystemPrompt)} resolvedFallback=${JSON.stringify(resolvedFallback)}`,
  )

  return {
    key: normalizedRouteKey,
    appKey,
    screenName: screen.screenName,
    intentHints: resolvedIntentHint,
    ragCollection: normalizedRouteKey,
    dataTools,
    actionTools,
    dataSystemPrompt: mergedDataSystemPrompt,
    actionSystemPrompt: mergedActionSystemPrompt,
    chatActions: {
      info: baseAction,
      data: `${baseAction}/filter`,
      action: `${baseAction}/action`,
    },
    fallbackText: resolvedFallback,
  }
}
