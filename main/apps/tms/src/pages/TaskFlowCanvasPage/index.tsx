import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import TaskFlowCanvasHeader from './Header'
import { useTaskFlowStore } from '@/store/taskflow.store'

import PropertyPanel from '@/pages/TaskFlowCanvasPage/PropertyPanel'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'

import { type DeployActionRequest, type TaskFlow } from '@/types/taskflow'
import type { InstantActionsPayload } from '@/types/api/deviceControl'
import { ensureStartNode } from '@/utils/node.util'
import {
  FLOW_SOURCE_QUERY_KEY,
  getFlowDefinitionBySource,
  hasFinal,
  normalizeFlowSource,
  pickEditableFlowDefinition
} from '@/utils/flowDefinition'

import { useCreateTaskFlow, useDeployTaskFlowAction, useGetTaskFlow, useUpdateTaskFlow } from '@/api/taskFlowApis'
import { useInstantAction } from '@/api/deviceControlApis'
import TaskFlowInfoDialog from '../components/dialog/TaskFlowInfoDialog'
import PalettePanel from './PalettePanel'
import { buildBehaviorTreeFromFlowDefinition } from '@/bt/build'
import { buildTaskFlowPersistPayload, type SaveMode } from '@/types/api/savePayload'
import {
  AI_TASKFLOW_CANVAS_CLARIFY_EVENT,
  AI_TASKFLOW_CANVAS_COMMAND_EVENT,
  AI_TASKFLOW_CANVAS_DRAFT_EVENT,
  AI_TASKFLOW_CANVAS_RESULT_EVENT,
  AI_TASKFLOW_REFRESH_CONTENTS_EVENT,
  RULE_KEY
} from '@repo/constants'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { Checkbox } from '@repo/ui'
import { Main, PageRoot, SaveHint } from './styles'
import PanelLayout from './PanelLayout'
import DrawPanel from './DrawPanel'
import type { PaletteItem } from '@/types/palette'
import { MarkerType } from '@xyflow/react'
import { useFlowEditorStore as useFlowEditorStoreHook, type RFEdge, type RFNode } from '@/store/taskflow.canvas.store'
import { buildAiTaskflowReplyText, resolveAiTaskflowCommandTarget } from '@/utils/aiTaskflowCommand'

type SaveOverride = { name: string; description: string }
type MoveToMapEntry = { nodeId: string; mapId: string }


declare global {
  interface Window {
    __AI_TASKFLOW_CANVAS_APPLY__?: (draft: AssistantDraft) => void
    __AI_TASKFLOW_CONTEXT__?: {
      taskFlowId: number
      nodes: RFNode[]
      edges: RFEdge[]
      viewport: { x?: number; y?: number; zoom?: number }
      flowMode: 'default' | 'tree'
      addableNodes: Array<Record<string, unknown>>
      taskList: Array<Record<string, unknown>>
      taskContents: Array<Record<string, unknown>>
      updatedAt: number
    }
  }
}

type AssistantStep = {
  label?: string
  title?: string
  name?: string
  taskName?: string
  contentName?: string
  taskType?: string
  taskId?: number | string
  contentId?: number | string
  properties?: Record<string, unknown>
}

type AssistantDraft = {
  mode?: 'replace' | 'edit'
  layout?: string
  flowMode?: 'default' | 'tree'
  assistantMessageId?: string
  steps?: Array<string | AssistantStep>
  removeByName?: string[]
  replaceByName?: Array<{
    target?: string
    step?: string | AssistantStep
  }>
  insertAfter?: Array<{
    after?: string
    step?: string | AssistantStep
    sourceHandle?: 'left' | 'right' | 'top' | 'bottom'
    targetHandle?: 'left' | 'right' | 'top' | 'bottom'
    reverseDirection?: boolean
    appendOnly?: boolean
    isolated?: boolean
  }>
  nodes?: RFNode[]
  edges?: RFEdge[]
  viewport?: { x?: number; y?: number; zoom?: number }
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function normalizeLooseText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function toPositiveNumber(value: unknown): number | undefined {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? next : undefined
}

function extractAssistantDraft(value: unknown): AssistantDraft | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Record<string, unknown>

  const mode = String(row.mode ?? '')
    .trim()
    .toLowerCase()
  const looksLikeEditDraft =
    (mode === 'edit' || mode === 'replace') &&
    (Array.isArray(row.insertAfter) ||
      Array.isArray(row.removeByName) ||
      Array.isArray(row.replaceByName) ||
      Array.isArray(row.steps) ||
      Array.isArray(row.nodes) ||
      Array.isArray(row.edges))
  if (looksLikeEditDraft) {
    return row as AssistantDraft
  }

  if (row.draft && typeof row.draft === 'object') {
    return extractAssistantDraft(row.draft)
  }

  if (Array.isArray(row.nodes) || Array.isArray(row.steps)) {
    return row as AssistantDraft
  }

  if (row.canvasDraft && typeof row.canvasDraft === 'object') {
    return row.canvasDraft as AssistantDraft
  }

  if (row.taskflowDraft && typeof row.taskflowDraft === 'object') {
    return row.taskflowDraft as AssistantDraft
  }

  if (row.canvas && typeof row.canvas === 'object') {
    return row.canvas as AssistantDraft
  }

  if (row.flowDefinition && typeof row.flowDefinition === 'object') {
    return row.flowDefinition as AssistantDraft
  }

  if (row.toolResult && typeof row.toolResult === 'object') {
    return extractAssistantDraft(row.toolResult)
  }

  if (row.executed && typeof row.executed === 'object') {
    return extractAssistantDraft(row.executed)
  }

  return null
}

function normalizeStepInput(input: string | AssistantStep): AssistantStep | null {
  if (typeof input === 'string') {
    const label = input.trim()
    return label ? { label } : null
  }

  if (!input || typeof input !== 'object') return null

  const label = String(input.label ?? input.title ?? input.name ?? input.contentName ?? '').trim()

  if (!label) return null

  return {
    ...input,
    label,
    taskName: String(input.taskName ?? '').trim() || undefined,
    contentName: String(input.contentName ?? '').trim() || undefined,
    taskType: String(input.taskType ?? '').trim() || undefined,
    taskId: toPositiveNumber(input.taskId),
    contentId: toPositiveNumber(input.contentId),
    properties:
      input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)
        ? (input.properties as Record<string, unknown>)
        : undefined
  }
}

function buildDefaultPropertiesFromSchema(
  schema: any,
  contentId?: number,
  contentTypeName?: string
): Record<string, unknown> {
  const propsDef = schema?.properties ?? {}
  const result: Record<string, unknown> = {}

  for (const [key, def] of Object.entries<any>(propsDef)) {
    if (def?.default !== undefined) {
      result[key] = def.default
      continue
    }

    if (def?.type === 'boolean') {
      result[key] = false
      continue
    }

    result[key] = ''
  }

  if (!contentId) return result

  for (const [key, def] of Object.entries<any>(propsDef)) {
    if (def?.type !== 'content_reference') continue
    const expected = String(def?.content_type ?? '').trim()
    if (!expected || expected === String(contentTypeName ?? '').trim()) {
      result[key] = contentId
    }
  }

  return result
}

function buildPaletteNameBuckets(palette: PaletteItem[]) {
  const controlNames = new Map<string, PaletteItem>()
  const contentNames = new Map<string, PaletteItem>()

  for (const item of palette) {
    if (item.kind === 'controlTaskNode') {
      const key = normalizeNameKey(item.task.name)
      if (key) controlNames.set(key, item)
    }

    if (item.kind === 'contentNode') {
      const key = normalizeNameKey(item.content.name)
      if (key) contentNames.set(key, item)
    }
  }

  return { controlNames, contentNames }
}

function resolvePaletteItem(step: AssistantStep, palette: PaletteItem[]): PaletteItem | null {
  const contentItems = palette.filter(
    (item): item is Extract<PaletteItem, { kind: 'contentNode' }> => item.kind === 'contentNode'
  )
  const controlItems = palette.filter(
    (item): item is Extract<PaletteItem, { kind: 'controlTaskNode' }> => item.kind === 'controlTaskNode'
  )
  const { controlNames, contentNames } = buildPaletteNameBuckets(palette)

  const stepTaskType = String(step.taskType ?? '')
    .trim()
    .toLowerCase()
  const stepTaskNameKey = normalizeText(step.taskName)
  const stepLabelKey = normalizeText(step.label)
  const looseLabelKey = normalizeLooseText(step.label || step.contentName || step.taskName)

  let byTaskName: PaletteItem | null = null
  let byLabelControl: PaletteItem | null = null
  let byContentName: PaletteItem | null = null
  let byLabelContent: PaletteItem | null = null
  let byContains: PaletteItem | null = null

  if (stepTaskType === 'control' || stepTaskNameKey || looseLabelKey) {
    const retryControl = controlItems.find((item) => {
      const itemText = normalizeLooseText(item.task.name || item.label)
      return itemText.includes('retry') || itemText.includes('재시도')
    })
    if (retryControl && (looseLabelKey.includes('retry') || looseLabelKey.includes('재시도'))) {
      return retryControl
    }

    const controlKeyCandidates = [stepTaskNameKey, stepLabelKey, looseLabelKey].filter(Boolean)
    for (const key of controlKeyCandidates) {
      const directControlMatch = controlNames.get(normalizeNameKey(key)) ?? null
      if (directControlMatch) return directControlMatch
    }

    byTaskName = stepTaskNameKey
      ? (controlItems.find((item) => normalizeText(item.task.name) === stepTaskNameKey) ?? null)
      : null
    if (byTaskName) return byTaskName

    byLabelControl = stepLabelKey
      ? (controlItems.find(
          (item) => normalizeText(item.label) === stepLabelKey || normalizeText(item.task.name) === stepLabelKey
        ) ?? null)
      : null
    if (byLabelControl) return byLabelControl
  }

  if (contentItems.length === 0) return null

  const stepContentId = toPositiveNumber(step.contentId)
  if (stepContentId) {
    const exact = contentItems.find((item) => Number(item.content.id) === stepContentId)
    if (exact) return exact
  }

  const stepTaskId = toPositiveNumber(step.taskId)
  if (stepTaskId && stepContentId) {
    const exactPair = contentItems.find(
      (item) => Number(item.task.id) === stepTaskId && Number(item.content.id) === stepContentId
    )
    if (exactPair) return exactPair
  }

  const labelKey = normalizeText(step.label)
  const contentNameKey = normalizeText(step.contentName)
  const taskNameKey = normalizeText(step.taskName)
  const contentKeyCandidates = [contentNameKey, labelKey, taskNameKey, looseLabelKey].filter(Boolean)
  for (const key of contentKeyCandidates) {
    const directContentMatch = contentNames.get(normalizeNameKey(key)) ?? null
    if (directContentMatch) return directContentMatch
  }

  const strictCandidates = contentItems.filter((item) => {
    if (stepTaskId && Number(item.task.id) !== stepTaskId) return false
    if (taskNameKey && normalizeText(item.task.name) !== taskNameKey) return false
    return true
  })
  const candidates = strictCandidates.length > 0 ? strictCandidates : contentItems

  byContentName =
    contentNameKey || labelKey
      ? (candidates.find((item) => normalizeText(item.content.name) === (contentNameKey || labelKey)) ?? null)
      : null
  if (byContentName) return byContentName

  byLabelContent = labelKey ? (candidates.find((item) => normalizeText(item.label) === labelKey) ?? null) : null
  if (byLabelContent) return byLabelContent

  const looseNeedle = normalizeLooseText(step.contentName || step.label)
  if (looseNeedle) {
    byContains =
      candidates.find((item) => {
        const contentKey = normalizeLooseText(item.content.name)
        const labelLooseKey = normalizeLooseText(item.label)
        return (
          contentKey.includes(looseNeedle) ||
          looseNeedle.includes(contentKey) ||
          labelLooseKey.includes(looseNeedle) ||
          looseNeedle.includes(labelLooseKey)
        )
      }) ?? null
    if (byContains) return byContains
  }

  const matchedItem: PaletteItem | null = byContentName ?? byLabelContent ?? byContains ?? byTaskName ?? null
  const matchedName = (() => {
    if (!matchedItem) return null
    const candidate = matchedItem as any
    return candidate.content?.name ?? candidate.task?.name ?? null
  })()

  console.log('[AI_TASKFLOW][PALETTE_MATCH_RESULT]', {
    step: {
      label: step.label,
      contentName: step.contentName,
      taskName: step.taskName,
      taskType: step.taskType
    },
    matched: Boolean(matchedItem),
    matchedName
  })

  return null
}

function buildLinearFlowDefinitionFromDraft(draft: AssistantDraft, palette: PaletteItem[]) {
  if (Array.isArray(draft.nodes) && Array.isArray(draft.edges)) {
    const shouldPassThrough = draft.nodes.some((node) => {
      const id = String(node?.id ?? '')
      const type = String(node?.type ?? '')
      const taskType = String((node as any)?.data?.taskType ?? '')
        .trim()
        .toUpperCase()
      return id === 'start' || type !== 'taskNode' || taskType === 'CONTROL'
    })

    if (shouldPassThrough) {
      return {
        nodes: draft.nodes,
        edges: draft.edges,
        viewport: draft.viewport ?? { x: 0, y: 0, zoom: 1 },
        flowMode: draft.flowMode === 'tree' ? 'tree' : 'default'
      }
    }
  }

  if (Array.isArray(draft.nodes)) {
    const normalizedSteps = draft.nodes
      .filter((node) => String(node?.id ?? '') !== 'start')
      .map((node) => toAssistantStepFromNode(node as RFNode))
      .filter((step): step is AssistantStep => Boolean(step))

    return buildLinearFlowDefinitionFromDraft(
      {
        ...draft,
        nodes: undefined,
        edges: undefined,
        steps: normalizedSteps
      },
      palette
    )
  }

  const steps = (Array.isArray(draft.steps) ? draft.steps : [])
    .map((step) => normalizeStepInput(step))
    .filter((step): step is AssistantStep => Boolean(step))

  if (steps.length === 0) return null

  // Start 노드와 같은 y축으로 배치해 첫 엣지가 휘지 않도록 정렬한다.
  // 간격은 기존보다 좁혀 화면이 더 컴팩트하게 보이게 한다.
  const startX = 0
  const startY = 0
  const baseX = startX + 150
  const baseY = startY
  const gapX = 140
  const builtNodes: RFNode[] = []
  const rejectedLabels: string[] = []

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    const item = resolvePaletteItem(step, palette)
    const nodeId = `ai-${Date.now()}-${i}`

    if (item?.kind === 'contentNode') {
      const defaults = buildDefaultPropertiesFromSchema(
        item.task.propertySchema,
        Number(item.content.id),
        String(item.content.contentTypeName ?? '')
      )

      builtNodes.push({
        id: nodeId,
        type: 'taskNode',
        position: { x: baseX + i * gapX, y: baseY },
        data: {
          label: item.content.name,
          taskId: item.task.id,
          taskName: item.task.name,
          taskType: item.task.taskType,
          contentId: item.content.id,
          contentName: item.content.name,
          contentTypeId: item.content.contentTypeId,
          contentTypeName: item.content.contentTypeName,
          contentValue: item.content.contentValue,
          contentVersion: item.content.contentVersion,
          groupId: item.content.groupId,
          siteId: item.content.siteId,
          propertySchema: item.task.propertySchema,
          properties: {
            ...defaults,
            ...(step.properties ?? {})
          }
        }
      })
      continue
    }

    if (item?.kind === 'controlTaskNode') {
      const defaults = buildDefaultPropertiesFromSchema(item.task.propertySchema)

      builtNodes.push({
        id: nodeId,
        type: 'taskNode',
        position: { x: baseX + i * gapX, y: baseY },
        data: {
          label: item.task.name,
          taskId: item.task.id,
          taskName: item.task.name,
          taskType: item.task.taskType,
          propertySchema: item.task.propertySchema,
          properties: {
            ...defaults,
            ...(step.properties ?? {})
          }
        }
      })
      continue
    }

    const label = String(step.label ?? step.contentName ?? step.taskName ?? '').trim()
    const fallbackTaskType = /retry|재시도/i.test(label) ? 'CONTROL' : 'ACTION'
    builtNodes.push({
      id: nodeId,
      type: 'taskNode',
      position: { x: baseX + i * gapX, y: baseY },
      data: {
        label,
        taskName: label,
        taskType: fallbackTaskType,
        contentName: label,
        propertySchema: { properties: {} },
        properties: {
          ...(step.properties ?? {})
        }
      }
    })
    rejectedLabels.push(label)
  }

  if (builtNodes.length === 0) {
    return {
      rejectedLabels
    }
  }

  const builtEdges: RFEdge[] = builtNodes.map((node, index) => {
    const source = index === 0 ? 'start' : builtNodes[index - 1]?.id
    return {
      id: `ai-edge-${Date.now()}-${index}`,
      source: String(source),
      target: String(node.id),
      sourceHandle: 'right',
      targetHandle: 'left',
      data: {
        sourceNodeId: String(source),
        targetNodeId: String(node.id),
        sourceHandleId: 'right',
        targetHandleId: 'left',
        edgeType: 'straight'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: '#94a3b8'
      },
      style: {
        stroke: '#94a3b8',
        strokeWidth: 1.25
      }
    }
  })

  return {
    nodes: builtNodes,
    edges: builtEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
    rejectedLabels
  }
}

function normalizeNameKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function toAssistantStepFromNode(node: RFNode): AssistantStep | null {
  const row = (node?.data ?? {}) as Record<string, unknown>
  const label = String(row.label ?? row.contentName ?? row.taskName ?? '').trim()
  if (!label) return null

  return {
    label,
    taskName: String(row.taskName ?? '').trim() || undefined,
    contentName: String(row.contentName ?? '').trim() || undefined,
    taskType: String(row.taskType ?? '').trim() || undefined,
    taskId: toPositiveNumber(row.taskId),
    contentId: toPositiveNumber(row.contentId),
    properties:
      row.properties && typeof row.properties === 'object' && !Array.isArray(row.properties)
        ? (row.properties as Record<string, unknown>)
        : undefined
  }
}

function matchesStepName(step: AssistantStep, target: string): boolean {
  const needle = normalizeNameKey(target)
  if (!needle) return false

  const taskType = String(step.taskType ?? '')
    .trim()
    .toUpperCase()
  const comparedNames =
    taskType === 'CONTROL'
      ? [step.taskName, step.label]
      : [step.contentName, step.label, step.taskName, step.taskName, step.contentName]

  const candidates = comparedNames.map((value) => normalizeNameKey(value)).filter(Boolean)

  return candidates.includes(needle)
}

function buildStartConnectedNodeSet(currentNodes: RFNode[], currentEdges: RFEdge[]): Set<string> {
  const hasStartNode = currentNodes.some((node) => String(node.id) === 'start')
  if (!hasStartNode) {
    return new Set(currentNodes.map((node) => String(node.id)))
  }

  const reachable = new Set<string>(['start'])
  const queue = ['start']

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue

    for (const edge of currentEdges) {
      const source = String(edge?.source ?? '')
      const target = String(edge?.target ?? '')
      if (source !== currentId || reachable.has(target)) continue
      reachable.add(target)
      queue.push(target)
    }
  }

  return reachable
}

function resolveTailNodeNames(currentNodes: RFNode[], currentEdges: RFEdge[]): string[] {
  const activeNodeIds = buildStartConnectedNodeSet(currentNodes, currentEdges)
  const nodes = currentNodes.filter((node) => {
    const id = String(node.id)
    return id !== 'start' && activeNodeIds.has(id)
  })
  if (nodes.length === 0) return []

  const outgoing = new Map<string, number>()
  for (const node of nodes) {
    outgoing.set(String(node.id), 0)
  }

  for (const edge of currentEdges) {
    const source = String(edge?.source ?? '')
    if (!activeNodeIds.has(source)) continue
    outgoing.set(source, Number(outgoing.get(source) ?? 0) + 1)
  }

  const tailNames = nodes
    .filter((node) => Number(outgoing.get(String(node.id)) ?? 0) === 0)
    .map((node) => toAssistantStepFromNode(node)?.label)
    .filter((label): label is string => Boolean(label && String(label).trim()))

  return [...new Set(tailNames.map((label) => label.trim()))]
}

function resolveTailNodeName(currentNodes: RFNode[], currentEdges: RFEdge[]): string | null | 'ambiguous' {
  const tailNames = resolveTailNodeNames(currentNodes, currentEdges)
  if (tailNames.length === 0) return null
  if (tailNames.length !== 1) return 'ambiguous'
  return tailNames[0]
}

function buildDraftEdge(
  source: string,
  target: string,
  seed: string,
  sourceHandle: 'left' | 'right' | 'top' | 'bottom' = 'right',
  targetHandle: 'left' | 'right' | 'top' | 'bottom' = 'left'
): RFEdge {
  const edgeType: 'straight' | 'step' =
    (sourceHandle === 'left' && targetHandle === 'left') ||
    (sourceHandle === 'top' && targetHandle === 'top') ||
    (sourceHandle === 'bottom' && targetHandle === 'bottom')
      ? 'step'
      : 'straight'

  return {
    id: `ai-edge-${seed}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    data: {
      sourceNodeId: source,
      targetNodeId: target,
      sourceHandleId: sourceHandle,
      targetHandleId: targetHandle,
      edgeType
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#94a3b8'
    },
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1.25
    }
  }
}

export function applyEditDraftToFlowDefinition(
  draft: AssistantDraft,
  currentNodes: RFNode[],
  currentEdges: RFEdge[],
  currentViewport: { x?: number; y?: number; zoom?: number },
  palette: PaletteItem[]
) {
  const initialNodeIds = new Set(currentNodes.map((node) => String(node.id)))
  const initialEdgeIds = new Set(currentEdges.map((edge) => String(edge.id)))

  const nextNodes: RFNode[] = currentNodes.map((node) => ({
    ...node,
    data: { ...(node.data ?? {}) }
  }))
  let nextEdges: RFEdge[] = currentEdges.map((edge) => ({
    ...edge,
    data: { ...(edge.data ?? {}) }
  }))
  const rejectedLabels: string[] = []

  const activeNodeIds = buildStartConnectedNodeSet(nextNodes, nextEdges)

  const findNodeByName = (name: string): RFNode | null => {
    const target = String(name ?? '').trim()
    if (!target) return null
    if (target === 'start' || target === '시작' || target === 'start node') {
      return nextNodes.find((node) => String(node.id) === 'start') ?? null
    }
    const currentNodeLabels = nextNodes.map((node) =>
      String((node?.data as any)?.label ?? (node as any)?.data?.contentName ?? (node as any)?.data?.taskName ?? node.id)
    )
    const controlPaletteNames = palette
      .filter((item) => item.kind === 'controlTaskNode')
      .map((item) => item.task.name)
      .filter(Boolean)
    const contentPaletteNames = palette
      .filter((item) => item.kind === 'contentNode')
      .map((item) => item.content.name)
      .filter(Boolean)
    const matches = nextNodes.filter((node) => {
      const id = String(node.id)
      if (id === 'start' || !activeNodeIds.has(id)) return false
      const step = toAssistantStepFromNode(node)
      return step ? matchesStepName(step, target) : false
    })
    if (matches.length === 0) {
      console.log('[AI_TASKFLOW][COMPARE_NODE_LIST]', {
        target,
        comparedAgainst: 'current-flow-nodes',
        currentNodeLabels,
        currentNodeCount: nextNodes.length,
        controlPaletteNames,
        contentPaletteNames,
        controlPaletteCount: controlPaletteNames.length,
        contentPaletteCount: contentPaletteNames.length,
        activeNodeIds: Array.from(activeNodeIds),
        edgeCount: nextEdges.length
      })
      console.log('[AI_TASKFLOW][FIND_NODE_BY_NAME_MISS]', {
        target,
        activeNodeIds: Array.from(activeNodeIds),
        currentNodeLabels,
        currentNodeCount: nextNodes.length,
        edgeCount: nextEdges.length,
        controlPaletteNames,
        contentPaletteNames,
        controlPaletteCount: controlPaletteNames.length,
        contentPaletteCount: contentPaletteNames.length
      })
      return null
    }
    // 같은 이름이 여러 개면 가장 최근 추가된 노드를 반환한다.
    return matches[matches.length - 1]
  }

  const removeNames = Array.isArray(draft.removeByName)
    ? draft.removeByName.map((value) => String(value ?? '').trim()).filter(Boolean)
    : []

  const replaceNames = Array.isArray(draft.replaceByName)
    ? draft.replaceByName
        .map((entry) => ({
          target: String(entry?.target ?? '').trim(),
          step: normalizeStepInput(entry?.step as string | AssistantStep)
        }))
        .filter((entry) => Boolean(entry.target) && Boolean(entry.step))
    : []

  const insertSpecs = Array.isArray(draft.insertAfter) ? draft.insertAfter : []
  const unresolvedInsertLabels = []
  const draftCreatedNodesByLabel = new Map<string, RFNode>()
  for (const insert of insertSpecs) {
    const normalized = normalizeStepInput(insert?.step as string | AssistantStep)
    if (!normalized) continue
    const paletteMatch = resolvePaletteItem(normalized, palette)
    const paletteCandidates = palette
      .map((item) =>
        item.kind === 'contentNode' ? item.content.name : item.kind === 'controlTaskNode' ? item.task.name : null
      )
      .filter(Boolean)
    console.log('[AI_TASKFLOW][INSERT_CANDIDATE_COMPARE]', {
      insertStep: normalized,
      paletteCandidates,
      paletteMatched: Boolean(paletteMatch),
      matchedName: paletteMatch
        ? paletteMatch.kind === 'contentNode'
          ? paletteMatch.content.name
          : paletteMatch.task.name
        : null,
      currentNodeLabels: nextNodes.map((node) =>
        String(
          (node?.data as any)?.label ?? (node as any)?.data?.contentName ?? (node as any)?.data?.taskName ?? node.id
        )
      )
    })
    if (!paletteMatch) {
      unresolvedInsertLabels.push(
        String(normalized.label ?? normalized.taskName ?? normalized.contentName ?? '').trim()
      )
    }
  }
  if (unresolvedInsertLabels.length > 0) {
    const missingLabels = Array.from(new Set(unresolvedInsertLabels.filter(Boolean)))
    const quotedLabels = missingLabels.map((label) => `"${label}"`).join(',')
    return {
      next: null,
      clarification:
        missingLabels.length === 1
          ? `${quotedLabels}노드 이름을 다시 확인해주세요`
          : `${quotedLabels} 노드 이름을 다시 확인해주세요`
    }
  }

  for (const name of removeNames) {
    const targets = nextNodes.filter((node) => {
      if (String(node.id) === 'start') return false
      const step = toAssistantStepFromNode(node)
      return step ? matchesStepName(step, name) : false
    })

    for (const targetNode of targets) {
      const targetId = String(targetNode.id)
      const incoming = nextEdges.filter((edge) => String(edge.target) === targetId)
      const outgoing = nextEdges.filter((edge) => String(edge.source) === targetId)

      nextEdges = nextEdges.filter((edge) => String(edge.source) !== targetId && String(edge.target) !== targetId)
      const bridgeSource = String(incoming[0]?.source ?? '')
      const bridgeTarget = String(outgoing[0]?.target ?? '')
      if (
        incoming.length === 1 &&
        outgoing.length === 1 &&
        bridgeSource &&
        bridgeTarget &&
        bridgeSource !== bridgeTarget &&
        !nextEdges.some((edge) => String(edge.source) === bridgeSource && String(edge.target) === bridgeTarget)
      ) {
        nextEdges.push(buildDraftEdge(bridgeSource, bridgeTarget, `${Date.now()}-bridge-${targetId}`))
      }

      const idx = nextNodes.findIndex((node) => String(node.id) === targetId)
      if (idx >= 0) nextNodes.splice(idx, 1)
    }
  }

  for (const replaceSpec of replaceNames) {
    const matchingNodes = nextNodes.filter((node) => {
      if (String(node.id) === 'start') return false
      const step = toAssistantStepFromNode(node)
      return step ? matchesStepName(step, replaceSpec.target) : false
    })

    if (matchingNodes.length === 0) continue

    if (!replaceSpec.step) continue
    const item = resolvePaletteItem(replaceSpec.step, palette)
    if (!item) {
      rejectedLabels.push(String(replaceSpec.step?.label ?? '').trim())
      continue
    }

    for (const targetNode of matchingNodes) {
      const replacementNodeId = String(targetNode.id)
      const replacementNode: RFNode = {
        ...targetNode,
        data: {
          ...(targetNode.data ?? {}),
          label: item.kind === 'contentNode' ? item.content.name : item.task.name,
          taskId: item.task.id,
          taskName: item.task.name,
          taskType: item.task.taskType,
          contentId: item.kind === 'contentNode' ? item.content.id : undefined,
          contentName: item.kind === 'contentNode' ? item.content.name : undefined,
          contentTypeId: item.kind === 'contentNode' ? item.content.contentTypeId : undefined,
          contentTypeName: item.kind === 'contentNode' ? item.content.contentTypeName : undefined,
          contentValue: item.kind === 'contentNode' ? item.content.contentValue : undefined,
          contentVersion: item.kind === 'contentNode' ? item.content.contentVersion : undefined,
          groupId: item.kind === 'contentNode' ? item.content.groupId : undefined,
          siteId: item.kind === 'contentNode' ? item.content.siteId : undefined,
          propertySchema: item.task.propertySchema,
          properties: {
            ...(item.kind === 'contentNode'
              ? buildDefaultPropertiesFromSchema(
                  item.task.propertySchema,
                  Number(item.content.id),
                  String(item.content.contentTypeName ?? '')
                )
              : buildDefaultPropertiesFromSchema(item.task.propertySchema))
          }
        }
      }

      const replaceIndex = nextNodes.findIndex((node) => String(node.id) === replacementNodeId)
      if (replaceIndex >= 0) {
        nextNodes[replaceIndex] = replacementNode
      }
    }
  }

  const inserts = Array.isArray(draft.insertAfter) ? draft.insertAfter : []
  const hasExistingNonStartNodes = nextNodes.some((node) => String(node.id) !== 'start')
  const tailNames = resolveTailNodeNames(nextNodes, nextEdges)

  for (let insertIndex = 0; insertIndex < inserts.length; insertIndex += 1) {
    const insert = inserts[insertIndex]
    let after = String(insert?.after ?? '').trim()
    const normalized = normalizeStepInput(insert?.step as string | AssistantStep)
    if (!normalized) continue

    const sourceHandle =
      insert?.sourceHandle === 'left'
        ? 'left'
        : insert?.sourceHandle === 'right'
          ? 'right'
          : insert?.sourceHandle === 'top'
            ? 'top'
            : insert?.sourceHandle === 'bottom'
              ? 'bottom'
              : 'right'
    const targetHandle =
      insert?.targetHandle === 'right'
        ? 'right'
        : insert?.targetHandle === 'left'
          ? 'left'
          : insert?.targetHandle === 'bottom'
            ? 'bottom'
            : insert?.targetHandle === 'top'
              ? 'top'
              : 'left'
    const reverseDirection = Boolean(insert?.reverseDirection)
    const appendOnly = Boolean(insert?.appendOnly)
    let isolated = Boolean((insert as any)?.isolated)
    const isStartLikeAnchor = ['', 'start', '시작', 'start node'].includes(after.toLowerCase())

    if (
      !isolated &&
      !appendOnly &&
      !reverseDirection &&
      hasExistingNonStartNodes &&
      insertIndex === 0 &&
      inserts.length > 1 &&
      (after === '' || isStartLikeAnchor)
    ) {
      isolated = true
    }

    const fanoutTailAnchors = appendOnly && (!after || isStartLikeAnchor) && tailNames.length > 1 ? tailNames : []

    if (fanoutTailAnchors.length > 0) {
      for (const tailName of fanoutTailAnchors) {
        const fanoutInsert = { ...insert, after: tailName }
        const fanoutAfter = String(tailName ?? '').trim()
        const fanoutNormalized = normalizeStepInput(fanoutInsert?.step as string | AssistantStep)
        if (!fanoutAfter || !fanoutNormalized) continue

        const fanoutAnchor = findNodeByName(fanoutAfter)
        if (!fanoutAnchor) continue

        const fanoutItem = resolvePaletteItem(fanoutNormalized, palette)
        if (!fanoutItem) {
          rejectedLabels.push(String(fanoutNormalized.label ?? '').trim())
          continue
        }

        const fanoutDefaults =
          fanoutItem.kind === 'contentNode'
            ? buildDefaultPropertiesFromSchema(
                fanoutItem.task.propertySchema,
                Number(fanoutItem.content.id),
                String(fanoutItem.content.contentTypeName ?? '')
              )
            : buildDefaultPropertiesFromSchema(fanoutItem.task.propertySchema)

        const fanoutNodeId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const fanoutAnchorX = Number(fanoutAnchor.position?.x ?? 0)
        const fanoutAnchorY = Number(fanoutAnchor.position?.y ?? 0)
        const fanoutOutgoing = nextEdges.filter((edge) => String(edge.source) === String(fanoutAnchor.id))
        const fanoutNextTargetId = String(fanoutOutgoing[0]?.target ?? '')

        const newFanoutNode: RFNode = {
          id: fanoutNodeId,
          type: 'taskNode',
          position: {
            x: fanoutAnchorX + 140,
            y: fanoutAnchorY
          },
          data: {
            label: fanoutItem.kind === 'contentNode' ? fanoutItem.content.name : fanoutItem.task.name,
            taskId: fanoutItem.task.id,
            taskName: fanoutItem.task.name,
            taskType: fanoutItem.task.taskType,
            contentId: fanoutItem.kind === 'contentNode' ? fanoutItem.content.id : undefined,
            contentName: fanoutItem.kind === 'contentNode' ? fanoutItem.content.name : undefined,
            contentTypeId: fanoutItem.kind === 'contentNode' ? fanoutItem.content.contentTypeId : undefined,
            contentTypeName: fanoutItem.kind === 'contentNode' ? fanoutItem.content.contentTypeName : undefined,
            contentValue: fanoutItem.kind === 'contentNode' ? fanoutItem.content.contentValue : undefined,
            contentVersion: fanoutItem.kind === 'contentNode' ? fanoutItem.content.contentVersion : undefined,
            groupId: fanoutItem.kind === 'contentNode' ? fanoutItem.content.groupId : undefined,
            siteId: fanoutItem.kind === 'contentNode' ? fanoutItem.content.siteId : undefined,
            propertySchema: fanoutItem.task.propertySchema,
            properties: {
              ...fanoutDefaults,
              ...(fanoutNormalized.properties ?? {})
            }
          }
        }

        nextNodes.push(newFanoutNode)
        nextEdges = nextEdges.filter((edge) => String(edge.id) !== String(fanoutOutgoing[0]?.id ?? ''))
        nextEdges.push(
          buildDraftEdge(
            String(fanoutAnchor.id),
            fanoutNodeId,
            `${Date.now()}-fanout-${fanoutNodeId}`,
            sourceHandle,
            targetHandle
          )
        )
        if (fanoutNextTargetId) {
          nextEdges.push(buildDraftEdge(fanoutNodeId, fanoutNextTargetId, `${Date.now()}-fanout-next-${fanoutNodeId}`))
        }
      }
      continue
    }

    // isolated: 기존 플로우와 무관하게 빈 공간에 노드만 배치한다.
    if (isolated) {
      const item = resolvePaletteItem(normalized, palette)
      console.log('[AI_TASKFLOW][ISOLATED]', {
        label: normalized.label,
        taskName: normalized.taskName,
        taskType: normalized.taskType,
        matched: Boolean(item),
        matchedKind: item?.kind,
        matchedName:
          item?.kind === 'contentNode' ? item.content.name : item?.kind === 'controlTaskNode' ? item.task.name : '-'
      })
      if (!item) {
        rejectedLabels.push(String(normalized.label ?? '').trim())
        continue
      }
      const defaults =
        item.kind === 'contentNode'
          ? buildDefaultPropertiesFromSchema(
              item.task.propertySchema,
              Number(item.content.id),
              String(item.content.contentTypeName ?? '')
            )
          : buildDefaultPropertiesFromSchema(item.task.propertySchema)

      const maxY = nextNodes.reduce((acc, n) => Math.max(acc, Number(n.position?.y ?? 0)), 0)
      const firstX = Number(nextNodes[0]?.position?.x ?? 200)
      let posX = firstX
      let posY = maxY + 200
      const OCCUPY_X = 96
      const OCCUPY_Y = 72
      const isOccupiedIsolated = (x: number, y: number) =>
        nextNodes.some(
          (n) =>
            Math.abs(Number(n.position?.x ?? 0) - x) < OCCUPY_X && Math.abs(Number(n.position?.y ?? 0) - y) < OCCUPY_Y
        )
      for (let lvl = 0; isOccupiedIsolated(posX, posY) && lvl < 8; lvl += 1) {
        posX += 140
      }

      const newNodeId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const isolatedNode: RFNode = {
        id: newNodeId,
        type: 'taskNode',
        position: { x: posX, y: posY },
        data: {
          label: item.kind === 'contentNode' ? item.content.name : item.task.name,
          taskId: item.task.id,
          taskName: item.task.name,
          taskType: item.task.taskType,
          contentId: item.kind === 'contentNode' ? item.content.id : undefined,
          contentName: item.kind === 'contentNode' ? item.content.name : undefined,
          contentTypeId: item.kind === 'contentNode' ? item.content.contentTypeId : undefined,
          contentTypeName: item.kind === 'contentNode' ? item.content.contentTypeName : undefined,
          contentValue: item.kind === 'contentNode' ? item.content.contentValue : undefined,
          contentVersion: item.kind === 'contentNode' ? item.content.contentVersion : undefined,
          groupId: item.kind === 'contentNode' ? item.content.groupId : undefined,
          siteId: item.kind === 'contentNode' ? item.content.siteId : undefined,
          propertySchema: item.task.propertySchema,
          properties: { ...defaults, ...(normalized.properties ?? {}) }
        }
      }
      nextNodes.push(isolatedNode)

      const isolatedLabelKey = normalizeNameKey(
        isolatedNode.data?.label ?? isolatedNode.data?.contentName ?? isolatedNode.data?.taskName
      )
      if (isolatedLabelKey) {
        draftCreatedNodesByLabel.set(isolatedLabelKey, isolatedNode)
      }
      continue
    }

    if (
      !after ||
      (hasExistingNonStartNodes &&
        !isolated &&
        !appendOnly &&
        !reverseDirection &&
        (after === 'start' || after === '시작' || after === 'start node'))
    ) {
      const tailNodeName = resolveTailNodeName(nextNodes, nextEdges)
      if (tailNodeName === 'ambiguous') {
        return {
          next: null,
          clarification: null
        }
      }
      after = String(tailNodeName ?? 'start').trim()
    }

    if (!after) continue

    const labelKey = normalizeNameKey(after)
    let anchorNode = labelKey ? (draftCreatedNodesByLabel.get(labelKey) ?? null) : null
    if (!anchorNode) {
      anchorNode = findNodeByName(after)
    }
    if (!anchorNode) {
      const fallbackTailName = resolveTailNodeName(nextNodes, nextEdges)
      if (fallbackTailName && fallbackTailName !== 'ambiguous') {
        const fallbackAnchor = findNodeByName(String(fallbackTailName))
        if (fallbackAnchor) {
          anchorNode = fallbackAnchor
          after = String(fallbackTailName)
        }
      }
    }

    if (!anchorNode) {
      const missingName = String(after ?? '').trim()
      console.warn('[AI_TASKFLOW][ANCHOR_MISS]', {
        after,
        nodes: nextNodes.map((n) => String((n as any).data?.label ?? n.id)),
        paletteNames: palette
          .map((item) =>
            item.kind === 'contentNode' ? item.content.name : item.kind === 'controlTaskNode' ? item.task.name : null
          )
          .filter(Boolean),
        activeNodeIds: Array.from(buildStartConnectedNodeSet(nextNodes, nextEdges))
      })
      return {
        next: null,
        clarification: missingName
          ? `"${missingName}" 노드를 찾지 못했습니다. 현재 캔버스에 있는 이름으로 다시 요청해 주세요.`
          : '기준 노드를 찾지 못했습니다. 현재 캔버스에 있는 이름으로 다시 요청해 주세요.'
      }
    }

    const item = resolvePaletteItem(normalized, palette)
    console.log('[AI_TASKFLOW][INSERT_MATCH]', {
      after,
      label: String(normalized.label ?? ''),
      contentName: String(normalized.contentName ?? ''),
      taskName: String(normalized.taskName ?? ''),
      matched: Boolean(item),
      paletteSize: palette.length
    })
    if (!item) {
      console.warn('[AI_TASKFLOW][PALETTE_MISS]', {
        after,
        label: normalized.label,
        taskName: normalized.taskName,
        taskType: normalized.taskType,
        contentId: normalized.contentId,
        controlNodes: palette.filter((p) => p.kind === 'controlTaskNode').map((p) => p.task.name)
      })
      rejectedLabels.push(String(normalized.label ?? '').trim())
      continue
    }

    const defaults =
      item.kind === 'contentNode'
        ? buildDefaultPropertiesFromSchema(
            item.task.propertySchema,
            Number(item.content.id),
            String(item.content.contentTypeName ?? '')
          )
        : buildDefaultPropertiesFromSchema(item.task.propertySchema)

    const newNodeId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const anchorX = Number(anchorNode.position?.x ?? 0)
    const anchorY = Number(anchorNode.position?.y ?? 0)
    const outgoing = nextEdges.filter((edge) => String(edge.source) === String(anchorNode.id))
    if (!reverseDirection && !appendOnly && outgoing.length > 1) {
      return {
        next: null,
        clarification: `${after} 이후 경로가 여러 개라 추가 위치를 정할 수 없습니다.`
      }
    }

    const nextTargetId = String(outgoing[0]?.target ?? '')
    const nextTargetNode = nextNodes.find((node) => String(node.id) === nextTargetId)

    const HORIZONTAL_GAP = 100
    const VERTICAL_GAP = 80

    const isVerticalAppend =
      appendOnly &&
      sourceHandle === targetHandle &&
      (sourceHandle === 'left' || sourceHandle === 'right' || sourceHandle === 'top' || sourceHandle === 'bottom')

    const basePosX = reverseDirection
      ? sourceHandle === 'left'
        ? anchorX - HORIZONTAL_GAP
        : sourceHandle === 'right'
          ? anchorX + HORIZONTAL_GAP
          : anchorX
      : appendOnly
        ? isVerticalAppend
          ? anchorX
          : sourceHandle === 'bottom' && targetHandle === 'top'
            ? anchorX
            : anchorX + (sourceHandle === 'left' ? -HORIZONTAL_GAP : HORIZONTAL_GAP)
        : sourceHandle === 'left'
          ? nextTargetNode
            ? Math.round((anchorX + Number(nextTargetNode.position?.x ?? anchorX - 160)) / 2)
            : anchorX - HORIZONTAL_GAP
          : sourceHandle === 'right'
            ? nextTargetNode
              ? Math.round((anchorX + Number(nextTargetNode.position?.x ?? anchorX + 160)) / 2)
              : anchorX + HORIZONTAL_GAP
            : anchorX

    const basePosY = reverseDirection
      ? anchorY
      : appendOnly
        ? isVerticalAppend
          ? anchorY + VERTICAL_GAP
          : sourceHandle === 'bottom' && targetHandle === 'top'
            ? anchorY + VERTICAL_GAP
            : anchorY
        : anchorY

    const findNonOverlappingPosition = (
      desiredX: number,
      desiredY: number,
      preferVerticalOffset: boolean
    ): { x: number; y: number } => {
      const OCCUPY_X_THRESHOLD = 82
      const OCCUPY_Y_THRESHOLD = 62
      const MAX_LEVEL = 8
      const SECONDARY_STEP = 24

      const isOccupied = (x: number, y: number) =>
        nextNodes.some((node) => {
          const nx = Number(node.position?.x ?? 0)
          const ny = Number(node.position?.y ?? 0)
          return Math.abs(nx - x) < OCCUPY_X_THRESHOLD && Math.abs(ny - y) < OCCUPY_Y_THRESHOLD
        })

      if (!isOccupied(desiredX, desiredY)) {
        return { x: desiredX, y: desiredY }
      }

      for (let level = 1; level <= MAX_LEVEL; level += 1) {
        const primary = level * (preferVerticalOffset ? VERTICAL_GAP : HORIZONTAL_GAP)
        const secondary = level * SECONDARY_STEP

        const candidates = preferVerticalOffset
          ? [
              { x: desiredX, y: desiredY + primary },
              { x: desiredX + secondary, y: desiredY + primary },
              { x: desiredX - secondary, y: desiredY + primary },
              { x: desiredX + secondary, y: desiredY - primary },
              { x: desiredX - secondary, y: desiredY - primary }
            ]
          : [
              { x: desiredX + primary, y: desiredY },
              { x: desiredX + primary, y: desiredY + secondary },
              { x: desiredX + primary, y: desiredY - secondary },
              { x: desiredX - primary, y: desiredY + secondary },
              { x: desiredX - primary, y: desiredY - secondary }
            ]

        for (const candidate of candidates) {
          if (!isOccupied(candidate.x, candidate.y)) {
            return candidate
          }
        }
      }

      return { x: desiredX, y: desiredY }
    }

    const preferVerticalOffset = appendOnly && sourceHandle === 'left' && targetHandle === 'left'
    const resolvedPos = findNonOverlappingPosition(basePosX, basePosY, preferVerticalOffset)

    const newNode: RFNode = {
      id: newNodeId,
      type: 'taskNode',
      position: { x: resolvedPos.x, y: resolvedPos.y },
      data: {
        label: item.kind === 'contentNode' ? item.content.name : item.task.name,
        taskId: item.task.id,
        taskName: item.task.name,
        taskType: item.task.taskType,
        contentId: item.kind === 'contentNode' ? item.content.id : undefined,
        contentName: item.kind === 'contentNode' ? item.content.name : undefined,
        contentTypeId: item.kind === 'contentNode' ? item.content.contentTypeId : undefined,
        contentTypeName: item.kind === 'contentNode' ? item.content.contentTypeName : undefined,
        contentValue: item.kind === 'contentNode' ? item.content.contentValue : undefined,
        contentVersion: item.kind === 'contentNode' ? item.content.contentVersion : undefined,
        groupId: item.kind === 'contentNode' ? item.content.groupId : undefined,
        siteId: item.kind === 'contentNode' ? item.content.siteId : undefined,
        propertySchema: item.task.propertySchema,
        properties: {
          ...defaults,
          ...(normalized.properties ?? {})
        }
      }
    }

    const createdLabelKey = normalizeNameKey(newNode.data?.label ?? newNode.data?.contentName ?? newNode.data?.taskName)
    if (createdLabelKey) {
      draftCreatedNodesByLabel.set(createdLabelKey, newNode)
    }

    console.log('[AI_TASKFLOW][NODE_CREATE]', {
      message: String((draft as any)?.message ?? ''),
      source: String(insert?.after ?? after ?? ''),
      anchor: {
        id: String(anchorNode.id),
        label: String(anchorNode.data?.label ?? anchorNode.data?.contentName ?? anchorNode.data?.taskName ?? ''),
        position: {
          x: Number(anchorNode.position?.x ?? 0),
          y: Number(anchorNode.position?.y ?? 0)
        }
      },
      createdNode: {
        id: newNodeId,
        label: String(newNode.data?.label ?? ''),
        taskName: String(newNode.data?.taskName ?? ''),
        contentName: String(newNode.data?.contentName ?? ''),
        position: {
          x: Number(newNode.position?.x ?? 0),
          y: Number(newNode.position?.y ?? 0)
        }
      }
    })

    if (appendOnly) {
      const existingOutgoing = nextEdges.filter((edge) => String(edge.source) === String(anchorNode.id))
      const existingTargetId = String(existingOutgoing[0]?.target ?? '')
      nextEdges = nextEdges.filter((edge) => String(edge.id) !== String(existingOutgoing[0]?.id ?? ''))
      nextEdges.push(
        buildDraftEdge(
          String(anchorNode.id),
          newNodeId,
          `${Date.now()}-append-${newNodeId}`,
          sourceHandle,
          targetHandle
        )
      )
      if (existingTargetId && existingTargetId !== newNodeId) {
        nextEdges.push(buildDraftEdge(newNodeId, existingTargetId, `${Date.now()}-append-next-${newNodeId}`))
      }
    } else if (reverseDirection) {
      const incoming = nextEdges.filter((edge) => String(edge.target) === String(anchorNode.id))
      if (incoming.length === 1) {
        const prevSource = String(incoming[0]?.source ?? '')
        nextEdges = nextEdges.filter((edge) => String(edge.id) !== String(incoming[0].id))
        if (prevSource && prevSource !== newNodeId) {
          nextEdges.push(buildDraftEdge(prevSource, newNodeId, `${Date.now()}-r-prev-${newNodeId}`))
        }
      }
      nextEdges.push(
        buildDraftEdge(
          newNodeId,
          String(anchorNode.id),
          `${Date.now()}-r-anchor-${newNodeId}`,
          sourceHandle,
          targetHandle
        )
      )
    } else if (outgoing.length === 1) {
      nextEdges = nextEdges.filter((edge) => String(edge.id) !== String(outgoing[0].id))
      nextEdges.push(
        buildDraftEdge(String(anchorNode.id), newNodeId, `${Date.now()}-a-${newNodeId}`, sourceHandle, targetHandle)
      )
      if (nextTargetId) {
        nextEdges.push(buildDraftEdge(newNodeId, nextTargetId, `${Date.now()}-b-${newNodeId}`))
      }
    } else {
      nextEdges.push(
        buildDraftEdge(String(anchorNode.id), newNodeId, `${Date.now()}-c-${newNodeId}`, sourceHandle, targetHandle)
      )
    }

    nextNodes.push(newNode)
  }

  const next = {
    nodes: nextNodes,
    edges: nextEdges,
    viewport: {
      x: Number(currentViewport?.x ?? 0),
      y: Number(currentViewport?.y ?? 0),
      zoom: Number(currentViewport?.zoom ?? 1)
    },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
    rejectedLabels
  }

  const nextNodeIds = new Set(nextNodes.map((node) => String(node.id)))
  const nextEdgeIds = new Set(nextEdges.map((edge) => String(edge.id)))
  const initialNodeSignature = new Map(
    currentNodes.map((node) => {
      const id = String(node.id)
      const state = JSON.stringify({
        label: String((node as any)?.data?.label ?? ''),
        taskName: String((node as any)?.data?.taskName ?? ''),
        contentName: String((node as any)?.data?.contentName ?? ''),
        taskType: String((node as any)?.data?.taskType ?? ''),
        position: node.position
      })
      return [id, state]
    })
  )
  const nextNodeSignature = new Map(
    nextNodes.map((node) => {
      const id = String(node.id)
      const state = JSON.stringify({
        label: String((node as any)?.data?.label ?? ''),
        taskName: String((node as any)?.data?.taskName ?? ''),
        contentName: String((node as any)?.data?.contentName ?? ''),
        taskType: String((node as any)?.data?.taskType ?? ''),
        position: node.position
      })
      return [id, state]
    })
  )
  const nodeChanged =
    nextNodeIds.size !== initialNodeIds.size ||
    Array.from(nextNodeIds).some((id) => !initialNodeIds.has(id)) ||
    Array.from(initialNodeIds).some((id) => !nextNodeIds.has(id)) ||
    Array.from(nextNodeIds).some((id) => initialNodeSignature.get(id) !== nextNodeSignature.get(id)) ||
    Array.from(initialNodeIds).some((id) => initialNodeSignature.get(id) !== nextNodeSignature.get(id))
  const edgeChanged =
    nextEdgeIds.size !== initialEdgeIds.size ||
    Array.from(nextEdgeIds).some((id) => !initialEdgeIds.has(id)) ||
    Array.from(initialEdgeIds).some((id) => !nextEdgeIds.has(id))

  if (!nodeChanged && !edgeChanged) {
    const firstRejected = rejectedLabels.find((label) => String(label ?? '').trim())
    return {
      next: null,
      clarification: firstRejected
        ? `"${firstRejected}" 노드를 찾지 못했습니다. TaskPanel의 정확한 이름으로 다시 요청해 주세요.`
        : '변경할 노드를 찾지 못했습니다. TaskPanel의 노드 이름으로 다시 요청해 주세요.'
    }
  }

  return {
    next,
    clarification: null
  }
}

function normalizeOrgId(value: any) {
  if (value == null) return ''
  const str = String(value).trim()
  return str
}

function parseMapIdFromContentValue(raw: unknown): string {
  if (!raw) return ''

  if (typeof raw === 'object') {
    const mapId = (raw as Record<string, unknown>)?.mapId
    return typeof mapId === 'string' ? mapId.trim() : ''
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed || trimmed[0] !== '{') return ''
    try {
      const parsed = JSON.parse(trimmed)
      const mapId = parsed?.mapId
      return typeof mapId === 'string' ? mapId.trim() : ''
    } catch {
      return ''
    }
  }

  return ''
}

export default function TaskFlowCanvasPage() {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const { taskFlowId } = useParams()
  const [searchParams] = useSearchParams()

  // 상세 화면에서 어느 쪽(저장 버전 / 최종 버전)을 불러올지 지정해서 들어온다.
  // 저장은 항상 저장 버전을 기준으로 하고, 최종 버전은 체크했을 때만 함께 갱신한다.
  const requestedSource = normalizeFlowSource(searchParams.get(FLOW_SOURCE_QUERY_KEY))

  const flows = useTaskFlowStore((s) => s.flows)
  const selectFlow = useTaskFlowStore((s) => s.selectFlow)
  const refreshFlows = useTaskFlowStore((s) => s.refreshFlows)
  const refreshSelectedFlow = useTaskFlowStore((s) => s.refreshSelectedFlow)

  const { mutateAsync: createTaskFlowAsync } = useCreateTaskFlow()
  const { mutateAsync: updateTaskFlowAsync } = useUpdateTaskFlow()

  const nodes = useFlowEditorStoreHook((s) => s.nodes)
  const edges = useFlowEditorStoreHook((s) => s.edges)
  const canvasNotes = useFlowEditorStoreHook((s) => s.canvasNotes)
  const viewport = useFlowEditorStoreHook((s) => s.viewport)
  const flowMode = useFlowEditorStoreHook((s) => s.flowMode)

  const initFlowEditor = useFlowEditorStoreHook((s) => s.initFlowEditor)
  const resetFlowEditor = useFlowEditorStoreHook((s) => s.resetFlowEditor)
  const adoptFlowKey = useFlowEditorStoreHook((s) => s.adoptFlowKey)

  const isDirty = useFlowEditorStoreHook((s) => s.isDirty)
  const markSaved = useFlowEditorStoreHook((s) => s.markSaved)

  const undo = useFlowEditorStoreHook((s) => s.undo)
  const redo = useFlowEditorStoreHook((s) => s.redo)
  const canUndo = useFlowEditorStoreHook((s) => s.canUndo)
  const canRedo = useFlowEditorStoreHook((s) => s.canRedo)
  const palette = useFlowEditorStoreHook((s) => s.palette)
  const applyFlowDefinitionWithHistory = useFlowEditorStoreHook((s) => s.applyFlowDefinitionWithHistory)
  const setFlowModeFromStore = useFlowEditorStoreHook((s) => s.setFlowMode)
  const alignSelectedNodesAuto = useFlowEditorStoreHook((s) => s.alignSelectedNodesAuto)
  const clearAllNodesExceptStart = useFlowEditorStoreHook((s) => s.clearAllNodesExceptStart)

  const numericFlowId = Number(taskFlowId)
  const isNewFlow = Number.isFinite(numericFlowId) && numericFlowId <= 0

  const { selectedOrgs, allOrgs } = useOrganizationStore()
  const { session } = useUserStore()
  const { mutateAsync: deployTaskFlowActionAsync } = useDeployTaskFlowAction()
  const { mutateAsync: sendInstantActionAsync } = useInstantAction()

  useEffect(() => {
    if (!Number.isFinite(numericFlowId)) {
      navigate('/tms', { replace: true })
      return
    }

    if (numericFlowId > 0) {
      selectFlow(numericFlowId)
    } else {
      selectFlow(null)
    }
  }, [navigate, numericFlowId, selectFlow])

  // 캔버스는 목록 캐시가 아니라 서버 단건 조회를 기준으로 초기화한다.
  // (목록은 App 진입/목록 페이지에서만 갱신돼 오래된 flowDefinitionDraft 로 열릴 수 있다)
  const { data: fetchedFlow } = useGetTaskFlow(numericFlowId > 0 ? numericFlowId : -1)

  const selectedFlow = useMemo<TaskFlow | null>(
    () => (fetchedFlow as TaskFlow | null) ?? flows.find((f) => f.id === numericFlowId) ?? null,
    [fetchedFlow, flows, numericFlowId]
  )
  const pendingDraftRef = useRef<AssistantDraft | null>(null)

  const logAppliedAiNodes = useCallback(
    (next: Record<string, unknown>, sourceMessage?: string) => {
      const nextNodes = Array.isArray(next?.nodes) ? next.nodes : []
      const currentIds = new Set(nodes.map((node) => String(node.id)))
      const addedNodes = nextNodes.filter((node: any) => {
        const id = String(node?.id ?? '')
        return Boolean(id) && !currentIds.has(id)
      })

      if (addedNodes.length === 0) return

      console.log('[AI_TASKFLOW][NODE_ADDED]', {
        message: sourceMessage ?? '',
        addedNodes: addedNodes.map((node: any) => ({
          id: String(node?.id ?? ''),
          label: String(node?.data?.label ?? ''),
          taskName: String(node?.data?.taskName ?? ''),
          contentName: String(node?.data?.contentName ?? ''),
          position: {
            x: Number(node?.position?.x ?? 0),
            y: Number(node?.position?.y ?? 0)
          }
        }))
      })
    },
    [nodes]
  )

  const applyAssistantDraftToCanvas = useCallback(
    (draftInput: unknown, sourceMessage?: string) => {
      const draft = extractAssistantDraft(draftInput)
      if (!draft) return false

      const assistantMessageId = String((draftInput as any)?.assistantMessageId ?? '').trim() || undefined
      if (assistantMessageId) {
        draft.assistantMessageId = assistantMessageId
      }

      console.log('[AI_TASKFLOW][DRAFT_RECEIVED]', {
        mode: String(draft.mode ?? ''),
        hasNodes: Array.isArray(draft.nodes),
        hasSteps: Array.isArray(draft.steps),
        insertCount: Array.isArray(draft.insertAfter) ? draft.insertAfter.length : 0,
        removeCount: Array.isArray(draft.removeByName) ? draft.removeByName.length : 0
      })

      const contentPaletteReady = palette.some((item) => item.kind === 'contentNode')
      if (!contentPaletteReady) {
        console.log('[AI_TASKFLOW][DRAFT_PENDING]', {
          reason: 'palette-not-ready',
          paletteSize: palette.length
        })
        pendingDraftRef.current = draft
        return false
      }

      pendingDraftRef.current = null

      const applied =
        draft.mode === 'edit' ? applyEditDraftToFlowDefinition(draft, nodes, edges, viewport, palette) : null

      console.log('[AI_TASKFLOW][APPLY_EDIT_RESULT]', {
        mode: String(draft.mode ?? ''),
        hasApplied: Boolean(applied),
        hasClarification: Boolean(applied?.clarification),
        appliedPreview: applied ? JSON.stringify(applied) : null,
        currentNodeCount: Array.isArray((applied as any)?.next?.nodes) ? (applied as any).next.nodes.length : 0,
        removeCount: Array.isArray(draft.removeByName) ? draft.removeByName.length : 0,
        replaceCount: Array.isArray(draft.replaceByName) ? draft.replaceByName.length : 0,
        insertCount: Array.isArray(draft.insertAfter) ? draft.insertAfter.length : 0
      })

      if (draft.mode === 'edit' && applied && applied.clarification) {
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, {
            detail: {
              message: applied.clarification,
              assistantMessageId: draft.assistantMessageId
            }
          })
        )
        return true
      }

      const next = draft.mode === 'edit' ? (applied?.next ?? null) : buildLinearFlowDefinitionFromDraft(draft, palette)

      console.log('[AI_TASKFLOW][NEXT_FLOW]', {
        mode: String(draft.mode ?? ''),
        hasNext: Boolean(next),
        nodeCount: Array.isArray((next as any)?.nodes) ? (next as any).nodes.length : 0,
        edgeCount: Array.isArray((next as any)?.edges) ? (next as any).edges.length : 0,
        nextPreview: next ? JSON.stringify(next) : null
      })

      if (!next || !Array.isArray((next as any).nodes) || (next as any).nodes.length === 0) {
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
            detail: {
              kind: 'draft',
              assistantMessageId: draft.assistantMessageId,
              success: false,
              didApply: false,
              insertedNodeCount: 0,
              message: '요청을 받았지만 실제 반영은 실패했습니다.'
            }
          })
        )
        return false
      }

      logAppliedAiNodes(next as Record<string, unknown>, String(sourceMessage ?? (draft as any)?.message ?? ''))
      applyFlowDefinitionWithHistory(next as Record<string, unknown>)

      const currentIds = new Set(nodes.map((n) => String(n.id)))
      const newNodeIds = ((next as any).nodes as any[])
        .map((n: any) => String(n?.id ?? ''))
        .filter((id) => id && !currentIds.has(id))
      if (newNodeIds.length > 0) {
        requestAnimationFrame(() => {
          ;(window as any).__AI_TASKFLOW_FIT_NODES__?.(newNodeIds)
        })
      }

      window.dispatchEvent(
        new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
          detail: {
            kind: 'draft',
            assistantMessageId: draft.assistantMessageId,
            success: newNodeIds.length > 0,
            didApply: newNodeIds.length > 0,
            insertedNodeCount: newNodeIds.length,
            message:
              newNodeIds.length > 0
                ? `${newNodeIds.length}개 노드를 새 공간에 추가했습니다.`
                : '요청을 받았지만 실제 반영은 실패했습니다.'
          }
        })
      )

      return true
    },
    [nodes, edges, viewport, palette, applyFlowDefinitionWithHistory]
  )

  useEffect(() => {
    const onTaskflowDraft = (event: Event) => {
      const custom = event as CustomEvent<any>
      const draftInput = custom?.detail
      if (!draftInput) return
      applyAssistantDraftToCanvas(draftInput, String(draftInput?.message ?? ''))
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_DRAFT_EVENT, onTaskflowDraft)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_DRAFT_EVENT, onTaskflowDraft)
    }
  }, [applyAssistantDraftToCanvas])

  useEffect(() => {
    window.__AI_TASKFLOW_CANVAS_APPLY__ = (draft: any) => {
      const sourceMessage = String(draft?.message ?? '')
      const applied = applyAssistantDraftToCanvas(draft, sourceMessage)
      if (applied) {
        console.log('[AI_TASKFLOW][DIRECT_APPLY_OK]', {
          message: sourceMessage,
          hasDraft: Boolean(extractAssistantDraft(draft))
        })
      }
    }

    return () => {
      if (window.__AI_TASKFLOW_CANVAS_APPLY__) {
        delete window.__AI_TASKFLOW_CANVAS_APPLY__
      }
    }
  }, [applyAssistantDraftToCanvas])

  useEffect(() => {
    const pending = pendingDraftRef.current
    if (!pending) return

    const contentPaletteReady = palette.some((item) => item.kind === 'contentNode')
    if (!contentPaletteReady) return

    console.log('[AI_TASKFLOW][DRAFT_REPLAY]', {
      mode: String(pending.mode ?? ''),
      paletteSize: palette.length
    })

    pendingDraftRef.current = null

    const applied =
      pending.mode === 'edit' ? applyEditDraftToFlowDefinition(pending, nodes, edges, viewport, palette) : null

    console.log('[AI_TASKFLOW][PENDING_APPLY_EDIT_RESULT]', {
      mode: String(pending.mode ?? ''),
      hasApplied: Boolean(applied),
      hasClarification: Boolean(applied?.clarification),
      appliedPreview: applied ? JSON.stringify(applied) : null
    })

    if (pending.mode === 'edit' && applied && applied.clarification) {
      window.dispatchEvent(
        new CustomEvent(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, {
          detail: {
            message: applied.clarification,
            assistantMessageId: pending.assistantMessageId
          }
        })
      )
      return
    }

    const next =
      pending.mode === 'edit' ? (applied?.next ?? null) : buildLinearFlowDefinitionFromDraft(pending, palette)

    console.log('[AI_TASKFLOW][PENDING_NEXT_FLOW]', {
      mode: String(pending.mode ?? ''),
      hasNext: Boolean(next),
      nodeCount: Array.isArray((next as any)?.nodes) ? (next as any).nodes.length : 0,
      edgeCount: Array.isArray((next as any)?.edges) ? (next as any).edges.length : 0,
      nextPreview: next ? JSON.stringify(next) : null
    })

    if (!next || !Array.isArray((next as any).nodes) || (next as any).nodes.length === 0) {
      window.dispatchEvent(
        new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
          detail: {
            kind: 'draft',
            assistantMessageId: pending.assistantMessageId,
            success: false,
            didApply: false,
            insertedNodeCount: 0,
            message: '요청을 받았지만 실제 반영은 실패했습니다.'
          }
        })
      )
      return
    }

    logAppliedAiNodes(next as Record<string, unknown>, String((pending as any)?.message ?? ''))
    applyFlowDefinitionWithHistory(next as Record<string, unknown>)

    const currentIds = new Set(nodes.map((n) => String(n.id)))
    const newNodeIds = ((next as any).nodes as any[])
      .map((n: any) => String(n?.id ?? ''))
      .filter((id) => id && !currentIds.has(id))

    window.dispatchEvent(
      new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
        detail: {
          kind: 'draft',
          assistantMessageId: pending.assistantMessageId,
          success: newNodeIds.length > 0,
          didApply: newNodeIds.length > 0,
          insertedNodeCount: newNodeIds.length,
          message:
            newNodeIds.length > 0
              ? `${newNodeIds.length}개 노드를 새 공간에 추가했습니다.`
              : '요청을 받았지만 실제 반영은 실패했습니다.'
        }
      })
    )
  }, [palette, nodes, edges, viewport, applyFlowDefinitionWithHistory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!Number.isFinite(numericFlowId) || numericFlowId <= 0) {
      if (window.__AI_TASKFLOW_CONTEXT__) {
        delete window.__AI_TASKFLOW_CONTEXT__
      }
      return
    }

    const addableNodes = palette
      .map((item) => {
        if (item.kind === 'contentNode') {
          return {
            kind: item.kind,
            taskId: item.task.id,
            taskName: item.task.name,
            label: item.label,
            contentId: item.content.id,
            contentName: item.content.name
          }
        }

        return {
          kind: item.kind,
          taskId: item.task.id,
          taskName: item.task.name,
          label: item.label
        }
      })
      .filter((item) => {
        const taskId = Number(item?.taskId)
        const label = String(item?.label ?? '').trim()
        return Number.isFinite(taskId) && taskId > 0 && Boolean(label)
      })

    const taskContents = addableNodes
      .map((item) => ({
        kind: String(item?.kind ?? '').trim(),
        taskId: Number(item?.taskId),
        taskName: String(item?.taskName ?? '').trim(),
        label: String(item?.label ?? '').trim(),
        contentId: Number.isFinite(Number(item?.contentId)) ? Number(item?.contentId) : undefined,
        contentName: String(item?.contentName ?? '').trim() || undefined
      }))
      .filter((item) => Number.isFinite(item.taskId) && item.taskId > 0 && item.label)

    const taskListMap = new Map<string, { taskId: number; label: string; taskName?: string }>()
    for (const item of addableNodes) {
      const taskId = Number(item?.taskId)
      const taskName = String(item?.taskName ?? '').trim()
      const label = String(item?.label ?? taskName).trim()
      if (!Number.isFinite(taskId) || taskId <= 0 || !label) continue
      const key = `${taskId}:${taskName || label}`
      if (taskListMap.has(key)) continue
      taskListMap.set(key, {
        taskId,
        label,
        taskName: taskName || undefined
      })
    }

    window.__AI_TASKFLOW_CONTEXT__ = {
      taskFlowId: numericFlowId,
      nodes,
      edges,
      viewport,
      flowMode,
      addableNodes,
      taskList: Array.from(taskListMap.values()),
      taskContents,
      updatedAt: Date.now()
    }

    return () => {
      if (window.__AI_TASKFLOW_CONTEXT__?.taskFlowId === numericFlowId) {
        delete window.__AI_TASKFLOW_CONTEXT__
      }
    }
  }, [numericFlowId, nodes, edges, viewport, flowMode, palette])

  const selectedFlowId = selectedFlow?.id ?? null

  const orgContext = useMemo(() => {
    const orgList = Array.isArray(allOrgs) ? allOrgs : []

    const groupCode = isNewFlow ? normalizeOrgId(selectedOrgs?.[0]) : normalizeOrgId(selectedFlow?.groupId)

    const siteCode = isNewFlow ? normalizeOrgId(selectedOrgs?.[1]) : normalizeOrgId(selectedFlow?.siteId)

    const matchedSite = orgList.find((o: any) => normalizeOrgId(o?.code) === siteCode)
    const matchedGroup = orgList.find((o: any) => normalizeOrgId(o?.code) === groupCode)

    const groupName =
      matchedSite?.parentDisplayName || matchedGroup?.displayName || matchedSite?.originalData?.groupName || ''

    const siteName = matchedSite?.displayName || matchedSite?.originalData?.siteName || ''

    return {
      groupId: groupCode || normalizeOrgId(matchedSite?.parentCode),
      siteId: siteCode || normalizeOrgId(matchedSite?.code),
      groupName,
      siteName
    }
  }, [isNewFlow, selectedOrgs, allOrgs, selectedFlow?.groupId, selectedFlow?.siteId])

  const selectedGroupId = orgContext.groupId
  const selectedSiteId = orgContext.siteId

  const [flowName, setFlowName] = useState('')
  const [flowDescription, setFlowDescription] = useState('')

  useEffect(() => {
    if (isNewFlow) {
      setFlowName('')
      setFlowDescription('')
      return
    }

    setFlowName(selectedFlow?.name ?? '')
    setFlowDescription(selectedFlow?.description ?? '')
  }, [isNewFlow, selectedFlow?.id, selectedFlow?.name, selectedFlow?.description])

  const prevKeyRef = useRef<string | null>(null)
  // 신규 저장 직후 URL 만 /canvas/{id} 로 바뀌는 경우, 편집 상태를 지우지 않고 그대로 이어받기 위한 표시
  const adoptedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const key = String(numericFlowId)

    if (adoptedKeyRef.current === key) {
      adoptedKeyRef.current = null
      prevKeyRef.current = key
      return
    }

    resetFlowEditor()
    prevKeyRef.current = null
  }, [numericFlowId, resetFlowEditor])

  useEffect(() => {
    if (isNewFlow) {
      const key = 'NEW'
      if (prevKeyRef.current === key) return
      prevKeyRef.current = key

      initFlowEditor(
        'new',
        ensureStartNode({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          flowMode: 'default'
        }) as unknown as Record<string, unknown>
      )
      return
    }

    if (!selectedFlow) return

    const key = String(selectedFlow.id)
    if (prevKeyRef.current === key) return
    prevKeyRef.current = key

    initFlowEditor(
      String(selectedFlow.id),
      pickEditableFlowDefinition(selectedFlow, requestedSource) as Record<string, unknown>
    )
  }, [isNewFlow, selectedFlow, initFlowEditor, requestedSource])

  const [saveDoneOpen, setSaveDoneOpen] = useState(false)
  const [saveErrorOpen, setSaveErrorOpen] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [saveMode, setSaveMode] = useState<SaveMode>('saved')
  const [resetAllNodesConfirmOpen, setResetAllNodesConfirmOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  // 저장 확인 모달 안에서 매번 선택한다. (체크하면 flowDefinition = 최종 버전까지 함께 갱신)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saveFinal, setSaveFinal] = useState(false)

  const [finalResetConfirmOpen, setFinalResetConfirmOpen] = useState(false)

  // BT 로 만들 수 없는 구성일 때 한 번 더 묻는다. (확인하면 저장 버전으로만 저장)
  const [btWarningOpen, setBtWarningOpen] = useState(false)
  const [btWarningReason, setBtWarningReason] = useState('')
  const pendingOverrideRef = useRef<SaveOverride | undefined>(undefined)

  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const saveAfterInfoRef = useRef(false)

  // 최종 버전을 만들지 못한 이유 (저장 완료 안내에 함께 보여준다)
  const [savedOnlyReason, setSavedOnlyReason] = useState('')

  const syncAfterCreate = async (created: TaskFlow) => {
    // URL 이 바뀌어도 방금 편집/저장한 상태를 그대로 유지한다. (저장소를 쓰지 않으므로 메모리로 이관)
    adoptedKeyRef.current = String(created.id)
    adoptFlowKey(String(created.id))

    navigate(`/tms/taskflows/${created.id}/canvas`, { replace: true })

    await refreshFlows(selectedGroupId, selectedSiteId)
    selectFlow(created.id)

    try {
      await refreshSelectedFlow()
    } catch {
      // optional
    }
  }

  const validateOrganization = useCallback(() => {
    const groupId = selectedGroupId || normalizeOrgId(selectedFlow?.groupId)
    const siteId = selectedSiteId || normalizeOrgId(selectedFlow?.siteId)

    if (!groupId || !siteId) {
      setSaveErrorMessage(t('canvas.page.orgRequired'))
      setSaveErrorOpen(true)
      return null
    }

    return { groupId, siteId }
  }, [selectedGroupId, selectedSiteId, selectedFlow?.groupId, selectedFlow?.siteId, t])

  // moveTo 노드들의 mapId 가 어긋나면 BT 로 만들 수 없다. 문제가 없으면 null 을 반환한다.
  const getMoveToMapIdError = useCallback(() => {
    const moveToEntries: MoveToMapEntry[] = nodes
      .filter((node: any) => {
        const data = node?.data ?? {}
        const taskType = String(data.taskType ?? '')
          .trim()
          .toUpperCase()
        const taskName = String(data.taskName ?? '')
          .trim()
          .toLowerCase()
        return taskType === 'ACTION' && taskName === 'moveto'
      })
      .map((node: any) => {
        const data = node?.data ?? {}
        return {
          nodeId: String(node?.id ?? ''),
          mapId: parseMapIdFromContentValue(data.contentValue)
        }
      })

    console.log('[SAVE][MoveTo] mapId list:', moveToEntries)

    if (moveToEntries.length <= 1) return null

    if (moveToEntries.some((entry) => !entry.mapId)) {
      return t('canvas.page.moveToMapIdMismatch')
    }

    const uniqueMapIds = new Set(moveToEntries.map((entry) => entry.mapId))
    if (uniqueMapIds.size > 1) {
      return t('canvas.page.moveToMapIdMismatch')
    }

    return null
  }, [nodes, t])

  /**
   * 저장 대상 결정.
   *  - "최종 버전 저장" 체크 → flowDefinitionDraft + flowDefinition 동시 갱신
   *  - 체크 없음            → flowDefinitionDraft(저장 버전) 만 갱신
   *
   * 최종 버전은 BT 생성이 되어야 만들 수 있다. BT 를 만들 수 없으면 reason 을 돌려주고,
   * 저장 버전으로만 저장할지 사용자에게 한 번 더 확인한다.
   */
  const resolveSaveTarget = useCallback(
    (withFinal: boolean): { mode: SaveMode; behaviorTree?: string; reason?: string } => {
      const mapIdError = getMoveToMapIdError()
      if (mapIdError) return { mode: 'saved', reason: mapIdError }

      try {
        const result = buildBehaviorTreeFromFlowDefinition({
          nodes,
          edges,
          flowMode
        } as any)

        console.log('[BT 변환] model:', result.model)
        console.log('[BT 변환] xml:\n' + result.xml)

        if (result.warnings?.length > 0) {
          console.warn('[BT 변환] warnings:\n' + result.warnings.join('\n'))
        }

        const xml = result.xml?.trim()
        if (!xml) return { mode: 'saved', reason: t('canvas.page.btNoResult') }

        return { mode: withFinal ? 'both' : 'saved', behaviorTree: xml }
      } catch (error: any) {
        console.error('[BT 변환] failed:', error)

        const message = error?.message || (typeof error === 'string' ? error : t('canvas.page.btUnknownError'))
        return { mode: 'saved', reason: message }
      }
    },
    [edges, flowMode, getMoveToMapIdError, nodes, t]
  )

  const doSave = async (mode: SaveMode, behaviorTreeXml?: string, override?: SaveOverride) => {
    try {
      setSaving(true)

      const trimmedName = (override?.name ?? flowName).trim()
      const trimmedDescription = (override?.description ?? flowDescription).trim()

      if (!trimmedName) {
        setSaveErrorMessage(t('canvas.page.nameRequired'))
        setSaveErrorOpen(true)
        return
      }

      const orgInfo = validateOrganization()
      if (!orgInfo) {
        return
      }

      if (mode === 'both' && !behaviorTreeXml?.trim()) {
        setSaveErrorMessage(t('canvas.page.btNoResult'))
        setSaveErrorOpen(true)
        return
      }

      const idForUpdate = numericFlowId > 0 ? numericFlowId : selectedFlowId

      const payload = buildTaskFlowPersistPayload({
        mode,
        flowId: isNewFlow ? 0 : idForUpdate,
        baseFlow: selectedFlow,
        flowName: trimmedName,
        flowDescription: trimmedDescription,
        nodes,
        edges,
        canvasNotes,
        viewport,
        flowMode,
        behaviorTree: behaviorTreeXml,
        groupId: orgInfo.groupId,
        siteId: orgInfo.siteId
      })

      console.log('[SAVE] flowDefinition:', payload.flowDefinition)

      if (isNewFlow) {
        const created = await createTaskFlowAsync(payload)
        markSaved()
        setSaveDoneOpen(true)
        await syncAfterCreate(created)
        return
      }

      if (!idForUpdate) return

      await updateTaskFlowAsync({ id: idForUpdate, patch: payload })
      markSaved()

      setSaveDoneOpen(true)
      await refreshSelectedFlow()
    } catch (e: any) {
      console.error('[SAVE] failed:', e)

      const msg = e?.response?.data?.message || e?.message || t('canvas.page.saveError')

      setSaveErrorMessage(msg)
      setSaveErrorOpen(true)
    } finally {
      setSaving(false)
    }
  }

  // withFinal: "최종 버전 저장" 체크 여부. (AI 커맨드 등 확인 모달을 거치지 않는 저장은 저장 버전만 갱신)
  const requestSave = async (override?: SaveOverride, withFinal = false) => {
    if (saving) return

    const trimmedName = (override?.name ?? flowName).trim()
    if (!trimmedName) {
      saveAfterInfoRef.current = true
      setInfoDialogOpen(true)
      return
    }

    const orgInfo = validateOrganization()
    if (!orgInfo) {
      return
    }

    const target = resolveSaveTarget(withFinal)

    // BT 로 만들 수 없는 구성이면 저장 버전으로만 남는다는 점을 한 번 더 확인한다.
    if (target.reason) {
      pendingOverrideRef.current = override
      setBtWarningReason(target.reason)
      setBtWarningOpen(true)
      return
    }

    setSaveMode(target.mode)
    setSavedOnlyReason('')

    await doSave(target.mode, target.behaviorTree, override)
  }

  const saveFromCommand = async (withFinal: boolean): Promise<{ success: boolean; message: string }> => {
    if (saving) {
      return { success: false, message: t('canvas.header.saving') }
    }

    const trimmedName = flowName.trim()
    const trimmedDescription = flowDescription.trim()
    if (!trimmedName) {
      return { success: false, message: t('canvas.page.nameRequired') }
    }

    const groupId = selectedGroupId || normalizeOrgId(selectedFlow?.groupId)
    const siteId = selectedSiteId || normalizeOrgId(selectedFlow?.siteId)
    if (!groupId || !siteId) {
      return { success: false, message: t('canvas.page.orgRequired') }
    }

    let mode: SaveMode = 'saved'
    let behaviorTree: string | undefined
    let resultMessage = ''
    if (withFinal) {
      const target = resolveSaveTarget(true)
      if (target.reason) {
        resultMessage = `${t('canvas.btWarning.title')}\n${t('canvas.btWarning.commandSavedOnlyDescription')}`
      } else {
        mode = 'both'
        behaviorTree = target.behaviorTree
      }
    }

    if (mode === 'both' && !behaviorTree?.trim()) {
      return { success: false, message: t('canvas.page.btNoResult') }
    }

    const idForUpdate = numericFlowId > 0 ? numericFlowId : selectedFlowId
    if (!isNewFlow && !idForUpdate) {
      return { success: false, message: t('canvas.page.saveError') }
    }

    try {
      setSaving(true)
      const payload = buildTaskFlowPersistPayload({
        mode,
        flowId: isNewFlow ? 0 : idForUpdate,
        baseFlow: selectedFlow,
        flowName: trimmedName,
        flowDescription: trimmedDescription,
        nodes,
        edges,
        canvasNotes,
        viewport,
        flowMode,
        behaviorTree,
        groupId,
        siteId
      })

      if (isNewFlow) {
        const created = await createTaskFlowAsync(payload)
        markSaved()
        await syncAfterCreate(created)
      } else if (idForUpdate) {
        await updateTaskFlowAsync({ id: idForUpdate, patch: payload })
        markSaved()
        await refreshSelectedFlow()
      }

      return { success: true, message: resultMessage }
    } catch (error: any) {
      console.error('[SAVE][COMMAND] failed:', error)
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || t('canvas.page.saveError')
      }
    } finally {
      setSaving(false)
    }
  }

  const onSave = () => {
    if (saving) return

    // 최종 버전 저장 여부는 저장할 때마다 새로 판단한다.
    setSaveFinal(false)
    setSaveConfirmOpen(true)
  }

  const canResetToFinal = hasFinal(selectedFlow)

  const applyFinalToCanvas = useCallback(() => {
    if (!canResetToFinal) return

    applyFlowDefinitionWithHistory(getFlowDefinitionBySource(selectedFlow, 'final') as Record<string, unknown>)
  }, [applyFlowDefinitionWithHistory, canResetToFinal, selectedFlow])

  const leaveCanvas = useCallback(() => {
    if (Number.isFinite(numericFlowId) && numericFlowId > 0) {
      navigate(`/tms/taskflows/${numericFlowId}/detail`)
      return
    }

    navigate('/tms')
  }, [navigate, numericFlowId])

  // 저장하지 않은 편집 내용은 캔버스를 벗어나면 사라지므로, 나가기 전에 한 번 확인한다.
  const handleBack = useCallback(() => {
    if (saving) return

    if (isDirty) {
      setLeaveConfirmOpen(true)
      return
    }

    leaveCanvas()
  }, [isDirty, leaveCanvas, saving])

  const resolveDeployRunTargets = (command: Record<string, unknown>) => {
    const fallbackTaskFlowId = Number.isFinite(Number(selectedFlowId ?? numericFlowId))
      ? Number(selectedFlowId ?? numericFlowId)
      : Number.NaN

    const fallbackRobotId = (() => {
      const pathname = String(window.location.pathname ?? '').trim()
      const match = pathname.match(/\/tms\/robots\/([^/]+)\/detail(?:\/.*)?$/)
      return match?.[1] ? decodeURIComponent(match[1]) : ''
    })()

    return resolveAiTaskflowCommandTarget(command, {
      robotId: fallbackRobotId,
      taskFlowId: fallbackTaskFlowId
    })
  }

  useEffect(() => {
    const onTaskflowCanvasCommand = async (event: Event) => {
      const custom = event as CustomEvent<any>
      const command = custom?.detail?.command
      if (!command || typeof command !== 'object') return
      const replyText = String(custom?.detail?.replyText ?? '').trim()
      const type = String(command?.type ?? '')
        .trim()
        .toLowerCase()

      console.info('[AI_TASKFLOW][RAW_EVENT_RECEIVED]', {
        page: 'TaskFlowCanvasPage',
        type,
        command
      })

      const dispatchResult = (success: boolean, message?: string) => {
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
            detail: {
              kind: 'command',
              commandType: type,
              success,
              didApply: success,
              message: String(message ?? '').trim() || replyText,
              assistantMessageId: String(custom?.detail?.assistantMessageId ?? '').trim() || undefined,
              historyContext: custom?.detail?.historyContext
            }
          })
        )
      }

      if (!type) return

      // 저장 방식이 하나로 통합되어, 예전 temp-save 커맨드도 같은 저장으로 처리한다.
      if (
        type === 'save' ||
        type === 'save-final' ||
        type === 'temp-save' ||
        type === 'save-temp' ||
        type === 'tempsave'
      ) {
        const result = await saveFromCommand(type === 'save' || type === 'save-final')
        dispatchResult(result.success, result.message || replyText)
        return
      }

      if (type === 'refresh-contents') {
        const detail: {
          handled: boolean
          complete: (result: { success: boolean; message?: string }) => void
        } = {
          handled: false,
          complete: () => undefined
        }
        const resultPromise = new Promise<{ success: boolean; message?: string }>((resolve) => {
          detail.complete = resolve
        })

        window.dispatchEvent(new CustomEvent(AI_TASKFLOW_REFRESH_CONTENTS_EVENT, { detail }))
        if (!detail.handled) {
          dispatchResult(false, t('canvas.nodeActions.refreshContentsError'))
          return
        }

        const result = await resultPromise
        dispatchResult(result.success, result.message || replyText)
        return
      }

      if (type === 'remove-nodes-by-name') {
        const names = Array.isArray(command?.names)
          ? command.names.map((name: unknown) => String(name ?? '').trim()).filter(Boolean)
          : []
        if (names.length === 0) {
          dispatchResult(false, String(command?.notFoundText ?? '').trim())
          return
        }

        const applied = applyEditDraftToFlowDefinition(
          { mode: 'edit', removeByName: names },
          nodes,
          edges,
          viewport,
          palette
        )
        const next = applied?.next
        const deletedCount = next && Array.isArray(next.nodes) ? nodes.length - next.nodes.length : 0
        if (!next || deletedCount <= 0) {
          dispatchResult(false, String(command?.notFoundText ?? '').trim())
          return
        }

        applyFlowDefinitionWithHistory(next as Record<string, unknown>)
        dispatchResult(true)
        return
      }

      if (type === 'set-flow-mode') {
        const modeRaw = String(command?.mode ?? '')
          .trim()
          .toLowerCase()
        const mode = modeRaw === 'tree' || modeRaw === 'vertical' || modeRaw === '세로' ? 'tree' : 'default'
        setFlowModeFromStore(mode)
        dispatchResult(true)
        return
      }

      if (type === 'undo') {
        if (!canUndo) {
          dispatchResult(false, t('canvas.commandErrors.undoUnavailable'))
          return
        }
        undo()
        dispatchResult(true)
        return
      }

      if (type === 'redo') {
        if (!canRedo) {
          dispatchResult(false, t('canvas.commandErrors.redoUnavailable'))
          return
        }
        redo()
        dispatchResult(true)
        return
      }

      if (type === 'reset-to-final') {
        if (!canResetToFinal) {
          dispatchResult(false, t('canvas.commandErrors.finalUnavailable'))
          return
        }
        applyFinalToCanvas()
        dispatchResult(true)
        return
      }

      if (type === 'clear-all' || type === 'reset-all') {
        clearAllNodesExceptStart()
        dispatchResult(true)
        return
      }

      if (type === 'align') {
        alignSelectedNodesAuto()
        dispatchResult(true)
        return
      }

      if (
        type === RULE_KEY.TASKFLOW_DEPLOY ||
        type === RULE_KEY.TASKFLOW_RUN ||
        type === RULE_KEY.TASKFLOW_PAUSE ||
        type === RULE_KEY.TASKFLOW_RESUME ||
        type === RULE_KEY.TASKFLOW_STOP ||
        type === 'deploy-taskflow' ||
        type === 'run-taskflow' ||
        type === 'pause-taskflow' ||
        type === 'resume-taskflow' ||
        type === 'stop-taskflow'
      ) {
        const { resolvedRobotId: robotId, taskFlowIdValue: taskFlowId } = resolveDeployRunTargets(command)
        const resolvedGroupId = selectedGroupId || normalizeOrgId(selectedFlow?.groupId)
        const resolvedSiteId = selectedSiteId || normalizeOrgId(selectedFlow?.siteId)

        console.info('[AI_TASKFLOW][COMMAND_RECEIVED]', {
          page: 'TaskFlowCanvasPage',
          type,
          robotId,
          taskFlowId,
          resolvedGroupId,
          resolvedSiteId,
          command
        })

        if (!robotId || !Number.isFinite(taskFlowId) || taskFlowId <= 0 || (!resolvedGroupId && (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow')) || (!resolvedSiteId && (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow'))) {
          console.warn('[AI_TASKFLOW][COMMAND_BLOCKED_BY_GUARD]', {
            page: 'TaskFlowCanvasPage',
            type,
            robotId,
            taskFlowId,
            resolvedGroupId,
            resolvedSiteId,
            requiresDeployOrg: type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow'
          })
          dispatchResult(false, String(command?.notFoundText ?? '배포/실행 대상 정보를 찾지 못했습니다.'))
          return
        }

        try {
          if (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow') {
            const deployPayload: DeployActionRequest = {
              taskFlowId,
              param: {
                action: 'DEPLOY',
                groupId: resolvedGroupId,
                siteId: resolvedSiteId,
                robotInfos: [{ groupId: String(resolvedGroupId ?? ''), siteId: String(resolvedSiteId ?? ''), id: robotId }],
                description: String(command?.description ?? 'AI command deploy taskflow')
              }
            }

            console.info('[AI_TASKFLOW][DEPLOY_API_CALL]', {
              type,
              robotId,
              taskFlowId,
              groupId: resolvedGroupId,
              siteId: resolvedSiteId,
              payload: deployPayload,
              message: replyText || `${robotId} 로봇에 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`
            })

            const deployResult = await deployTaskFlowActionAsync(deployPayload)
            console.info('[AI_TASKFLOW][DEPLOY_API_RESULT]', {
              type,
              robotId,
              taskFlowId,
              result: deployResult,
            })
            const finalDeployReply = buildAiTaskflowReplyText(replyText || `${robotId} 로봇에 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`, robotId, taskFlowId)
            dispatchResult(true, finalDeployReply || `${robotId} 로봇에 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`)
            return
          }

          const userId = String(session?.userId ?? '')
          if (!userId) {
            dispatchResult(false, '실행/제어를 요청하려면 로그인된 사용자 정보가 필요합니다.')
            return
          }

          const instantActionTypeMap: Record<string, string> = {
            [RULE_KEY.TASKFLOW_RUN]: 'start',
            [RULE_KEY.TASKFLOW_PAUSE]: 'startPause',
            [RULE_KEY.TASKFLOW_RESUME]: 'stopPause',
            [RULE_KEY.TASKFLOW_STOP]: 'stop',
            'run-taskflow': 'start',
            'pause-taskflow': 'startPause',
            'resume-taskflow': 'stopPause',
            'stop-taskflow': 'stop',
          }

          const actionType = instantActionTypeMap[type] ?? 'start'
          const instantPayload: InstantActionsPayload = {
            userId,
            actions: [
              {
                actionType,
                actionId: crypto.randomUUID(),
                blockingType: 'HARD',
                actionParameters: [{ key: 'tms_id', value: String(taskFlowId) }]
              }
            ]
          }

          const instantRequest = {
            deviceId: robotId,
            body: instantPayload
          }

          console.info('[AI_TASKFLOW][INSTANT_ACTION_CALL]', {
            type,
            robotId,
            taskFlowId,
            actionType,
            userId,
            payload: instantRequest,
          })

          const instantResult = await sendInstantActionAsync(instantRequest)
          console.info('[AI_TASKFLOW][INSTANT_ACTION_RESULT]', {
            type,
            robotId,
            taskFlowId,
            actionType,
            result: instantResult,
          })

          const defaultReplyMap: Record<string, string> = {
            [RULE_KEY.TASKFLOW_RUN]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 실행을 요청했습니다.`,
            [RULE_KEY.TASKFLOW_PAUSE]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 일시정지를 요청했습니다.`,
            [RULE_KEY.TASKFLOW_RESUME]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 재개를 요청했습니다.`,
            [RULE_KEY.TASKFLOW_STOP]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 정지를 요청했습니다.`,
            'run-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 실행을 요청했습니다.`,
            'pause-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 일시정지를 요청했습니다.`,
            'resume-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 재개를 요청했습니다.`,
            'stop-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 정지를 요청했습니다.`,
          }

          const finalReplyText = buildAiTaskflowReplyText(replyText || defaultReplyMap[type] || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 제어를 요청했습니다.`, robotId, taskFlowId)
          dispatchResult(true, finalReplyText || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 제어를 요청했습니다.`)
          return
        } catch (error) {
          console.error('[AI_TASKFLOW][COMMAND_RUN_FAILED]', error)
          dispatchResult(false, String(command?.notFoundText ?? '배포/실행 요청에 실패했습니다.'))
          return
        }
      }

      dispatchResult(false, t('canvas.commandErrors.unsupported'))
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    }
  }, [saveFromCommand, nodes, edges, viewport, palette, applyFlowDefinitionWithHistory, setFlowModeFromStore, canUndo, undo, canRedo, redo, canResetToFinal, applyFinalToCanvas, clearAllNodesExceptStart, alignSelectedNodesAuto])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

      if (!(e.ctrlKey || e.metaKey)) return

      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <PageRoot>
      <TaskFlowCanvasHeader
        onBack={handleBack}
        description={flowDescription}
        title={isNewFlow ? flowName || t('canvas.page.newFlowTitle') : flowName || t('canvas.page.defaultTitle')}
        status={(selectedFlow as any)?.status}
        onEditInfo={() => {
          saveAfterInfoRef.current = false
          setInfoDialogOpen(true)
        }}
        onSave={onSave}
        onResetToFinal={() => setFinalResetConfirmOpen(true)}
        canResetToFinal={canResetToFinal}
        onUndo={undo}
        onRedo={redo}
        onResetAllNodes={() => setResetAllNodesConfirmOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
      />

      <Main>
        <PanelLayout
          left={<PalettePanel groupId={selectedGroupId} siteId={selectedSiteId} />}
          center={<DrawPanel />}
          right={<PropertyPanel />}
        />
      </Main>

      <TaskFlowInfoDialog
        open={infoDialogOpen}
        title={t('canvas.page.infoDialogTitle')}
        description={t('canvas.page.infoDialogDesc')}
        confirmText={t('canvas.page.apply')}
        loading={saving}
        initialName={flowName}
        initialDescription={flowDescription}
        onClose={() => {
          if (saving) return
          saveAfterInfoRef.current = false
          setInfoDialogOpen(false)
        }}
        onConfirm={({ name, description }: { name: string; description: string }) => {
          const trimmedName = name.trim()

          if (!trimmedName) {
            setSaveErrorMessage(t('canvas.page.nameRequired'))
            setSaveErrorOpen(true)
            return
          }

          setFlowName(name)
          setFlowDescription(description)
          setInfoDialogOpen(false)

          const shouldSave = saveAfterInfoRef.current
          saveAfterInfoRef.current = false
          if (shouldSave) {
            void requestSave({ name, description }, saveFinal)
          }
        }}
      />

      <ConfirmModal
        open={leaveConfirmOpen}
        title={t('canvas.leaveConfirm.title')}
        description={t('canvas.leaveConfirm.description')}
        confirmText={t('canvas.leaveConfirm.confirm')}
        confirmVariant="danger"
        closeOnOverlayClick
        onCancel={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false)
          leaveCanvas()
        }}
      />

      <ConfirmModal
        open={saveConfirmOpen}
        title={t('canvas.saveConfirm.title')}
        description={t('canvas.saveConfirm.description')}
        confirmText={saving ? t('canvas.header.saving') : t('canvas.header.save')}
        confirmDisabled={saving}
        onCancel={() => {
          if (saving) return
          setSaveConfirmOpen(false)
        }}
        onConfirm={async () => {
          if (saving) return
          setSaveConfirmOpen(false)
          await requestSave(undefined, saveFinal)
        }}
      >
        <Checkbox
          label={t('canvas.saveConfirm.saveFinal')}
          checked={saveFinal}
          disabled={saving}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveFinal(e.target.checked)}
        />
        <SaveHint>{t('canvas.saveConfirm.saveFinalHint')}</SaveHint>
      </ConfirmModal>

      {/* BT 생성이 불가능한 구성 → 저장 버전으로만 저장할지 재확인 */}
      <ConfirmModal
        open={btWarningOpen}
        title={t('canvas.btWarning.title')}
        description={`${t('canvas.btWarning.description')}${btWarningReason ? `\n\n${btWarningReason}` : ''}`}
        confirmText={saving ? t('canvas.header.saving') : t('canvas.btWarning.confirm')}
        confirmDisabled={saving}
        onCancel={() => {
          if (saving) return
          pendingOverrideRef.current = undefined
          setBtWarningOpen(false)
        }}
        onConfirm={async () => {
          if (saving) return

          const override = pendingOverrideRef.current
          pendingOverrideRef.current = undefined
          setBtWarningOpen(false)

          setSaveMode('saved')
          setSavedOnlyReason(btWarningReason)

          await doSave('saved', undefined, override)
        }}
      />

      <ConfirmModal
        open={finalResetConfirmOpen}
        title={t('canvas.finalReset.title')}
        description={t('canvas.finalReset.description')}
        confirmText={t('canvas.finalReset.confirm')}
        closeOnOverlayClick={!saving}
        onCancel={() => {
          if (saving) return
          setFinalResetConfirmOpen(false)
        }}
        onConfirm={() => {
          if (saving) return
          applyFinalToCanvas()
          setFinalResetConfirmOpen(false)
        }}
      />

      <ConfirmModal
        open={resetAllNodesConfirmOpen}
        title="전체 노드 초기화"
        description="Start 노드를 제외한 모든 노드와 연결선을 삭제하시겠습니까?"
        confirmText="초기화"
        cancelText="취소"
        closeOnOverlayClick={!saving}
        onCancel={() => {
          if (saving) return
          setResetAllNodesConfirmOpen(false)
        }}
        onConfirm={() => {
          if (saving) return
          clearAllNodesExceptStart()
          setResetAllNodesConfirmOpen(false)
        }}
      />

      <ConfirmModal
        open={saveDoneOpen}
        title={saveMode === 'both' ? t('canvas.page.finalSaveDoneTitle') : t('canvas.page.saveDoneTitle')}
        description={
          saveMode === 'both'
            ? t('canvas.page.finalSaveDoneDesc')
            : `${t('canvas.page.saveDoneDesc')}${
                savedOnlyReason
                  ? `

${t('canvas.page.finalSkipped')}
${savedOnlyReason}`
                  : ''
              }`
        }
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveDoneOpen(false)}
        onConfirm={() => setSaveDoneOpen(false)}
      />

      <ConfirmModal
        open={saveErrorOpen}
        title={t('canvas.page.saveFailTitle')}
        description={saveErrorMessage}
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveErrorOpen(false)}
        onConfirm={() => setSaveErrorOpen(false)}
      />
    </PageRoot>
  )
}
