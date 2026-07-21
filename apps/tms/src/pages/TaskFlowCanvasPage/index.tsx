import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import TaskFlowCanvasHeader from './Header'
import { useTaskFlowStore } from '@/store/taskflow.store'

import PropertyPanel from '@/pages/TaskFlowCanvasPage/PropertyPanel'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'

import { TaskFlow } from '@/types/taskflow'
import { ensureStartNode } from '@/utils/node.util'

import { useCreateTaskFlow, useUpdateTaskFlow } from '@/api/taskFlowApis'
import TaskFlowInfoDialog from '../components/dialog/TaskFlowInfoDialog'
import PalettePanel from './PalettePanel'
import { buildBehaviorTreeFromFlowDefinition } from '@/bt/build'
import { buildTaskFlowPersistPayload } from '@/types/api/savePayload'
import { useOrganizationStore } from '@repo/stores'
import { Main, PageRoot } from './styles'
import PanelLayout from './PanelLayout'
import DrawPanel from './DrawPanel'
import type { PaletteItem } from '@/types/palette'
import { MarkerType } from '@xyflow/react'
import { useFlowEditorStore as useFlowEditorStoreHook, type RFEdge, type RFNode } from '@/store/taskflow.canvas.store'

type SaveMode = 'save' | 'temp'
type SubmitState = 'save' | 'temp' | null
type SaveOverride = { name: string; description: string }
type BtModalMode = 'save-gate' | null
type BtModalStatus = 'success' | 'error'
type MoveToMapEntry = { nodeId: string; mapId: string }

const AI_TASKFLOW_CANVAS_EVENT = 'ai-assistant:taskflow-canvas-draft'
const AI_TASKFLOW_CANVAS_CLARIFY_EVENT = 'ai-assistant:taskflow-canvas-clarify'
const AI_TASKFLOW_CANVAS_COMMAND_EVENT = 'ai-assistant:taskflow-canvas-command'

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
  insertAfter?: Array<{
    after?: string
    step?: string | AssistantStep
  }>
  nodes?: RFNode[]
  edges?: RFEdge[]
  viewport?: { x?: number; y?: number; zoom?: number }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '')
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

  const mode = String(row.mode ?? '').trim().toLowerCase()
  const looksLikeEditDraft =
    (mode === 'edit' || mode === 'replace') && (
      Array.isArray(row.insertAfter) ||
      Array.isArray(row.removeByName) ||
      Array.isArray(row.steps) ||
      Array.isArray(row.nodes) ||
      Array.isArray(row.edges)
    )
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

  const label = String(
    input.label ?? input.title ?? input.name ?? input.contentName ?? '',
  ).trim()

  if (!label) return null

  return {
    ...input,
    label,
    taskName: String(input.taskName ?? '').trim() || undefined,
    contentName: String(input.contentName ?? '').trim() || undefined,
    taskType: String(input.taskType ?? '').trim() || undefined,
    taskId: toPositiveNumber(input.taskId),
    contentId: toPositiveNumber(input.contentId),
    properties: input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)
      ? (input.properties as Record<string, unknown>)
      : undefined,
  }
}

function buildDefaultPropertiesFromSchema(
  schema: any,
  contentId?: number,
  contentTypeName?: string,
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

function resolvePaletteItem(step: AssistantStep, palette: PaletteItem[]): PaletteItem | null {
  const contentItems = palette.filter((item): item is Extract<PaletteItem, { kind: 'contentNode' }> => item.kind === 'contentNode')
  const controlItems = palette.filter((item): item is Extract<PaletteItem, { kind: 'controlTaskNode' }> => item.kind === 'controlTaskNode')

  const stepTaskType = String(step.taskType ?? '').trim().toLowerCase()
  const stepTaskNameKey = normalizeText(step.taskName)
  const stepLabelKey = normalizeText(step.label)

  if (stepTaskType === 'control' || stepTaskNameKey) {
    const byTaskName = stepTaskNameKey
      ? controlItems.find((item) => normalizeText(item.task.name) === stepTaskNameKey)
      : null
    if (byTaskName) return byTaskName

    const byLabel = stepLabelKey
      ? controlItems.find((item) => normalizeText(item.label) === stepLabelKey || normalizeText(item.task.name) === stepLabelKey)
      : null
    if (byLabel) return byLabel
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
      (item) => Number(item.task.id) === stepTaskId && Number(item.content.id) === stepContentId,
    )
    if (exactPair) return exactPair
  }

  const labelKey = normalizeText(step.label)
  const contentNameKey = normalizeText(step.contentName)
  const taskNameKey = normalizeText(step.taskName)

  const strictCandidates = contentItems.filter((item) => {
    if (stepTaskId && Number(item.task.id) !== stepTaskId) return false
    if (taskNameKey && normalizeText(item.task.name) !== taskNameKey) return false
    return true
  })
  const candidates = strictCandidates.length > 0 ? strictCandidates : contentItems

  const byContentName = (contentNameKey || labelKey)
    ? candidates.find((item) => normalizeText(item.content.name) === (contentNameKey || labelKey))
    : null
  if (byContentName) return byContentName

  const byLabel = labelKey
    ? candidates.find((item) => normalizeText(item.label) === labelKey)
    : null
  if (byLabel) return byLabel

  const looseNeedle = normalizeLooseText(step.contentName || step.label)
  if (looseNeedle) {
    const byContains = candidates.find((item) => {
      const contentKey = normalizeLooseText(item.content.name)
      const labelLooseKey = normalizeLooseText(item.label)
      return (
        contentKey.includes(looseNeedle) ||
        looseNeedle.includes(contentKey) ||
        labelLooseKey.includes(looseNeedle) ||
        looseNeedle.includes(labelLooseKey)
      )
    })
    if (byContains) return byContains
  }

  return null
}

function buildLinearFlowDefinitionFromDraft(draft: AssistantDraft, palette: PaletteItem[]) {
  if (Array.isArray(draft.nodes) && Array.isArray(draft.edges)) {
    const shouldPassThrough = draft.nodes.some((node) => {
      const id = String(node?.id ?? '')
      const type = String(node?.type ?? '')
      const taskType = String((node as any)?.data?.taskType ?? '').trim().toUpperCase()
      return id === 'start' || type !== 'taskNode' || taskType === 'CONTROL'
    })

    if (shouldPassThrough) {
      return {
        nodes: draft.nodes,
        edges: draft.edges,
        viewport: draft.viewport ?? { x: 0, y: 0, zoom: 1 },
        flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
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
        steps: normalizedSteps,
      },
      palette,
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
        String(item.content.contentTypeName ?? ''),
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
          groupId: item.content.groupId,
          siteId: item.content.siteId,
          propertySchema: item.task.propertySchema,
          properties: {
            ...defaults,
            ...(step.properties ?? {}),
          },
        },
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
            ...(step.properties ?? {}),
          },
        },
      })
      continue
    }

    rejectedLabels.push(String(step.label ?? '').trim())
  }

  if (builtNodes.length === 0) {
    return {
      rejectedLabels,
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
        edgeType: 'straight',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
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

  return {
    nodes: builtNodes,
    edges: builtEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
    rejectedLabels,
  }
}

function normalizeNameKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '')
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
        : undefined,
  }
}

function matchesStepName(step: AssistantStep, target: string): boolean {
  const needle = normalizeNameKey(target)
  if (!needle) return false

  const candidates = [step.label, step.contentName, step.taskName]
    .map((value) => normalizeNameKey(value))
    .filter(Boolean)

  return candidates.includes(needle)
}

function resolveTailNodeName(currentNodes: RFNode[], currentEdges: RFEdge[]): string | null | 'ambiguous' {
  const nodes = currentNodes.filter((node) => String(node.id) !== 'start')
  if (nodes.length === 0) return null

  const outgoing = new Map<string, number>()
  for (const node of nodes) {
    outgoing.set(String(node.id), 0)
  }

  for (const edge of currentEdges) {
    const source = String(edge?.source ?? '')
    if (!outgoing.has(source)) continue
    outgoing.set(source, Number(outgoing.get(source) ?? 0) + 1)
  }

  const tailNodes = nodes.filter((node) => Number(outgoing.get(String(node.id)) ?? 0) === 0)
  if (tailNodes.length !== 1) return 'ambiguous'

  const tail = toAssistantStepFromNode(tailNodes[0])
  if (!tail?.label) return null
  return tail.label
}

function buildDraftEdge(source: string, target: string, seed: string): RFEdge {
  return {
    id: `ai-edge-${seed}`,
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
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: '#94a3b8',
    },
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1.25,
    },
  }
}

function applyEditDraftToFlowDefinition(
  draft: AssistantDraft,
  currentNodes: RFNode[],
  currentEdges: RFEdge[],
  currentViewport: { x?: number; y?: number; zoom?: number },
  palette: PaletteItem[],
) {
  const initialNodeIds = new Set(currentNodes.map((node) => String(node.id)))
  const initialEdgeIds = new Set(currentEdges.map((edge) => String(edge.id)))

  const nextNodes: RFNode[] = currentNodes.map((node) => ({
    ...node,
    data: { ...(node.data ?? {}) },
  }))
  let nextEdges: RFEdge[] = currentEdges.map((edge) => ({
    ...edge,
    data: { ...(edge.data ?? {}) },
  }))
  const rejectedLabels: string[] = []

  const findNodeByName = (name: string): RFNode | null => {
    const target = String(name ?? '').trim()
    if (!target) return null
    if (target === 'start' || target === '시작' || target === 'start node') {
      return nextNodes.find((node) => String(node.id) === 'start') ?? null
    }
    const matches = nextNodes.filter((node) => {
      if (String(node.id) === 'start') return false
      const step = toAssistantStepFromNode(node)
      return step ? matchesStepName(step, target) : false
    })
    if (matches.length !== 1) return null
    return matches[0]
  }

  const removeNames = Array.isArray(draft.removeByName)
    ? draft.removeByName.map((value) => String(value ?? '').trim()).filter(Boolean)
    : []

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

      nextEdges = nextEdges.filter(
        (edge) => String(edge.source) !== targetId && String(edge.target) !== targetId,
      )
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

  const inserts = Array.isArray(draft.insertAfter) ? draft.insertAfter : []
  for (const insert of inserts) {
    let after = String(insert?.after ?? '').trim()
    const normalized = normalizeStepInput(insert?.step as string | AssistantStep)
    if (!normalized) continue

    if (!after) {
      const tailNodeName = resolveTailNodeName(nextNodes, nextEdges)
      if (tailNodeName === 'ambiguous') {
        return {
          next: null,
          clarification: '어느 노드 뒤에 추가할까요? 예: "회의실 A 이후에 추가해줘"',
        }
      }
      after = String(tailNodeName ?? 'start').trim()
    }

    if (!after) continue

    const anchorNode = findNodeByName(after)
    if (!anchorNode) {
      return {
        next: null,
        clarification: `${after} 뒤에 추가하려면 기준 노드를 하나로 특정해 주세요.`,
      }
    }

    const item = resolvePaletteItem(normalized, palette)
    console.log('[AI_TASKFLOW][INSERT_MATCH]', {
      after,
      label: String(normalized.label ?? ''),
      contentName: String(normalized.contentName ?? ''),
      taskName: String(normalized.taskName ?? ''),
      matched: Boolean(item),
      paletteSize: palette.length,
    })
    if (!item) {
      rejectedLabels.push(String(normalized.label ?? '').trim())
      continue
    }

    const defaults = item.kind === 'contentNode'
      ? buildDefaultPropertiesFromSchema(
        item.task.propertySchema,
        Number(item.content.id),
        String(item.content.contentTypeName ?? ''),
      )
      : buildDefaultPropertiesFromSchema(item.task.propertySchema)

    const newNodeId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const anchorX = Number(anchorNode.position?.x ?? 0)
    const anchorY = Number(anchorNode.position?.y ?? 0)
    const outgoing = nextEdges.filter((edge) => String(edge.source) === String(anchorNode.id))
    if (outgoing.length > 1) {
      return {
        next: null,
        clarification: `${after} 이후 경로가 여러 개라 추가 위치를 정할 수 없습니다.`,
      }
    }

    const nextTargetId = String(outgoing[0]?.target ?? '')
    const nextTargetNode = nextNodes.find((node) => String(node.id) === nextTargetId)
    const basePosX = nextTargetNode
      ? Math.round((anchorX + Number(nextTargetNode.position?.x ?? anchorX + 160)) / 2)
      : anchorX + 140

    const newNode: RFNode = {
      id: newNodeId,
      type: 'taskNode',
      position: { x: basePosX, y: anchorY },
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
        groupId: item.kind === 'contentNode' ? item.content.groupId : undefined,
        siteId: item.kind === 'contentNode' ? item.content.siteId : undefined,
        propertySchema: item.task.propertySchema,
        properties: {
          ...defaults,
          ...(normalized.properties ?? {}),
        },
      },
    }

    console.log('[AI_TASKFLOW][NODE_CREATE]', {
      message: String((draft as any)?.message ?? ''),
      source: String(insert?.after ?? after ?? ''),
      anchor: {
        id: String(anchorNode.id),
        label: String(anchorNode.data?.label ?? anchorNode.data?.contentName ?? anchorNode.data?.taskName ?? ''),
        position: {
          x: Number(anchorNode.position?.x ?? 0),
          y: Number(anchorNode.position?.y ?? 0),
        },
      },
      createdNode: {
        id: newNodeId,
        label: String(newNode.data?.label ?? ''),
        taskName: String(newNode.data?.taskName ?? ''),
        contentName: String(newNode.data?.contentName ?? ''),
        position: {
          x: Number(newNode.position?.x ?? 0),
          y: Number(newNode.position?.y ?? 0),
        },
      },
    })

    if (outgoing.length === 1) {
      nextEdges = nextEdges.filter((edge) => String(edge.id) !== String(outgoing[0].id))
      nextEdges.push(buildDraftEdge(String(anchorNode.id), newNodeId, `${Date.now()}-a-${newNodeId}`))
      if (nextTargetId) {
        nextEdges.push(buildDraftEdge(newNodeId, nextTargetId, `${Date.now()}-b-${newNodeId}`))
      }
    } else {
      nextEdges.push(buildDraftEdge(String(anchorNode.id), newNodeId, `${Date.now()}-c-${newNodeId}`))
    }

    nextNodes.push(newNode)
  }

  const next = {
    nodes: nextNodes,
    edges: nextEdges,
    viewport: {
      x: Number(currentViewport?.x ?? 0),
      y: Number(currentViewport?.y ?? 0),
      zoom: Number(currentViewport?.zoom ?? 1),
    },
    flowMode: draft.flowMode === 'tree' ? 'tree' : 'default',
    rejectedLabels,
  }

  const nextNodeIds = new Set(nextNodes.map((node) => String(node.id)))
  const nextEdgeIds = new Set(nextEdges.map((edge) => String(edge.id)))
  const nodeChanged =
    nextNodeIds.size !== initialNodeIds.size ||
    Array.from(nextNodeIds).some((id) => !initialNodeIds.has(id)) ||
    Array.from(initialNodeIds).some((id) => !nextNodeIds.has(id))
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
        : '변경할 노드를 찾지 못했습니다. TaskPanel의 노드 이름으로 다시 요청해 주세요.',
    }
  }

  return {
    next,
    clarification: null,
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

  const flows = useTaskFlowStore((s) => s.flows)
  const selectFlow = useTaskFlowStore((s) => s.selectFlow)
  const refreshFlows = useTaskFlowStore((s) => s.refreshFlows)
  const refreshSelectedFlow = useTaskFlowStore((s) => s.refreshSelectedFlow)

  const { mutateAsync: createTaskFlowAsync } = useCreateTaskFlow()
  const { mutateAsync: updateTaskFlowAsync } = useUpdateTaskFlow()

  const nodes = useFlowEditorStoreHook((s) => s.nodes)
  const edges = useFlowEditorStoreHook((s) => s.edges)
  const viewport = useFlowEditorStoreHook((s) => s.viewport)
  const flowMode = useFlowEditorStoreHook((s) => s.flowMode)

  const initFlowEditor = useFlowEditorStoreHook((s) => s.initFlowEditor)
  const resetFlowEditor = useFlowEditorStoreHook((s) => s.resetFlowEditor)
  const clearPersistedHistory = useFlowEditorStoreHook((s) => s.clearPersistedHistory)
  const adoptFlowKey = useFlowEditorStoreHook((s) => s.adoptFlowKey)

  const undo = useFlowEditorStoreHook((s) => s.undo)
  const redo = useFlowEditorStoreHook((s) => s.redo)
  const canUndo = useFlowEditorStoreHook((s) => s.canUndo)
  const canRedo = useFlowEditorStoreHook((s) => s.canRedo)
  const palette = useFlowEditorStoreHook((s) => s.palette)
  const loadFromFlowDefinition = useFlowEditorStoreHook((s) => s.loadFromFlowDefinition)
  const setFlowModeFromStore = useFlowEditorStoreHook((s) => s.setFlowMode)
  const alignSelectedNodesAuto = useFlowEditorStoreHook((s) => s.alignSelectedNodesAuto)

  const numericFlowId = Number(taskFlowId)
  const isNewFlow = Number.isFinite(numericFlowId) && numericFlowId <= 0

  const { selectedOrgs, allOrgs } = useOrganizationStore()

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

  const selectedFlow = useMemo(
    () => flows.find((f) => f.id === numericFlowId) ?? null,
    [flows, numericFlowId]
  )
  const pendingDraftRef = useRef<AssistantDraft | null>(null)

  const logAppliedAiNodes = useCallback((next: Record<string, unknown>, sourceMessage?: string) => {
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
          y: Number(node?.position?.y ?? 0),
        },
      })),
    })
  }, [nodes])

  useEffect(() => {
    const onTaskflowDraft = (event: Event) => {
      const custom = event as CustomEvent<any>
      const draft = extractAssistantDraft(custom?.detail)
      if (!draft) return
      const assistantMessageId = String(custom?.detail?.assistantMessageId ?? '').trim() || undefined
      if (assistantMessageId) {
        draft.assistantMessageId = assistantMessageId
      }

      console.log('[AI_TASKFLOW][DRAFT_RECEIVED]', {
        mode: String(draft.mode ?? ''),
        hasNodes: Array.isArray(draft.nodes),
        hasSteps: Array.isArray(draft.steps),
        insertCount: Array.isArray(draft.insertAfter) ? draft.insertAfter.length : 0,
        removeCount: Array.isArray(draft.removeByName) ? draft.removeByName.length : 0,
      })

      const contentPaletteReady = palette.some((item) => item.kind === 'contentNode')
      if (!contentPaletteReady) {
        console.log('[AI_TASKFLOW][DRAFT_PENDING]', {
          reason: 'palette-not-ready',
          paletteSize: palette.length,
        })
        pendingDraftRef.current = draft
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, {
            detail: {
              message: 'TaskPanel 로딩 중이라 AI 편집을 잠시 보류했습니다. 로딩 완료 후 자동 적용합니다.',
              assistantMessageId,
            },
          })
        )
        return
      }

      pendingDraftRef.current = null

      const applied = draft.mode === 'edit'
        ? applyEditDraftToFlowDefinition(draft, nodes, edges, viewport, palette)
        : null

      if (draft.mode === 'edit' && applied && applied.clarification) {
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, {
            detail: {
              message: applied.clarification,
              assistantMessageId: draft.assistantMessageId,
            },
          })
        )
        return
      }

      const next = draft.mode === 'edit'
        ? (applied?.next ?? null)
        : buildLinearFlowDefinitionFromDraft(draft, palette)

      if (!next || !Array.isArray((next as any).nodes) || (next as any).nodes.length === 0) return

      logAppliedAiNodes(next as Record<string, unknown>, String((draft as any)?.message ?? ''))
      loadFromFlowDefinition(next as Record<string, unknown>)
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_EVENT, onTaskflowDraft)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_EVENT, onTaskflowDraft)
    }
  }, [nodes, edges, viewport, palette, loadFromFlowDefinition])

  useEffect(() => {
    const pending = pendingDraftRef.current
    if (!pending) return

    const contentPaletteReady = palette.some((item) => item.kind === 'contentNode')
    if (!contentPaletteReady) return

    console.log('[AI_TASKFLOW][DRAFT_REPLAY]', {
      mode: String(pending.mode ?? ''),
      paletteSize: palette.length,
    })

    pendingDraftRef.current = null

    const applied = pending.mode === 'edit'
      ? applyEditDraftToFlowDefinition(pending, nodes, edges, viewport, palette)
      : null

    if (pending.mode === 'edit' && applied && applied.clarification) {
      window.dispatchEvent(
        new CustomEvent(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, {
          detail: {
            message: applied.clarification,
            assistantMessageId: pending.assistantMessageId,
          },
        })
      )
      return
    }

    const next = pending.mode === 'edit'
      ? (applied?.next ?? null)
      : buildLinearFlowDefinitionFromDraft(pending, palette)
    if (!next || !Array.isArray((next as any).nodes) || (next as any).nodes.length === 0) return

    logAppliedAiNodes(next as Record<string, unknown>, String((pending as any)?.message ?? ''))
    loadFromFlowDefinition(next as Record<string, unknown>)
  }, [palette, nodes, edges, viewport, loadFromFlowDefinition])

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
            contentName: item.content.name,
          }
        }

        return {
          kind: item.kind,
          taskId: item.task.id,
          taskName: item.task.name,
          label: item.label,
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
        contentName: String(item?.contentName ?? '').trim() || undefined,
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
        taskName: taskName || undefined,
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
      updatedAt: Date.now(),
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

    const groupCode = isNewFlow
      ? normalizeOrgId(selectedOrgs?.[0])
      : normalizeOrgId(selectedFlow?.groupId)

    const siteCode = isNewFlow
      ? normalizeOrgId(selectedOrgs?.[1])
      : normalizeOrgId(selectedFlow?.siteId)

    const matchedSite = orgList.find((o: any) => normalizeOrgId(o?.code) === siteCode)
    const matchedGroup = orgList.find((o: any) => normalizeOrgId(o?.code) === groupCode)

    const groupName =
      matchedSite?.parentDisplayName ||
      matchedGroup?.displayName ||
      matchedSite?.originalData?.groupName ||
      ''

    const siteName =
      matchedSite?.displayName ||
      matchedSite?.originalData?.siteName ||
      ''

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
  }, [
    isNewFlow,
    selectedFlow?.id,
    selectedFlow?.name,
    selectedFlow?.description
  ])

  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    resetFlowEditor()
    prevKeyRef.current = null
  }, [numericFlowId, resetFlowEditor])

  useEffect(() => {
    if (isNewFlow) {
      const key = 'NEW'
      if (prevKeyRef.current === key) return
      prevKeyRef.current = key

      clearPersistedHistory('new')

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
      selectedFlow.flowDefinitionDraft as Record<string, unknown>
    )
  }, [isNewFlow, selectedFlow, initFlowEditor, clearPersistedHistory])

  const [saveDoneOpen, setSaveDoneOpen] = useState(false)
  const [saveErrorOpen, setSaveErrorOpen] = useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [saveMode, setSaveMode] = useState<SaveMode>('save')
  const [submitState, setSubmitState] = useState<SubmitState>(null)

  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const saveAfterInfoRef = useRef<SaveMode | null>(null)

  const [btModalOpen, setBtModalOpen] = useState(false)
  const [btModalMode, setBtModalMode] = useState<BtModalMode>(null)
  const [btModalStatus, setBtModalStatus] = useState<BtModalStatus>('success')
  const [btModalTitle, setBtModalTitle] = useState('')
  const [btModalMessage, setBtModalMessage] = useState('')
  const [pendingBehaviorTree, setPendingBehaviorTree] = useState<string>('')

  const syncAfterCreate = async (created: TaskFlow) => {
    adoptFlowKey(String(created.id))
    clearPersistedHistory('new')

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

  const validateMoveToMapId = useCallback(() => {
    const moveToEntries: MoveToMapEntry[] = nodes
      .filter((node: any) => {
        const data = node?.data ?? {}
        const taskType = String(data.taskType ?? '').trim().toUpperCase()
        const taskName = String(data.taskName ?? '').trim().toLowerCase()
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

    if (moveToEntries.length <= 1) return true

    if (moveToEntries.some((entry) => !entry.mapId)) {
      setSaveErrorMessage(t('canvas.page.moveToMapIdMismatch'))
      setSaveErrorOpen(true)
      return false
    }

    const uniqueMapIds = new Set(moveToEntries.map((entry) => entry.mapId))
    if (uniqueMapIds.size > 1) {
      setSaveErrorMessage(t('canvas.page.moveToMapIdMismatch'))
      setSaveErrorOpen(true)
      return false
    }

    return true
  }, [nodes, t])

  const doSave = async (mode: SaveMode, behaviorTreeXml?: string, override?: SaveOverride) => {
    try {
      setSaving(true)
      setSubmitState(mode)

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

      if (mode === 'save' && !behaviorTreeXml?.trim()) {
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
        viewport,
        flowMode,
        behaviorTree: behaviorTreeXml,
        groupId: orgInfo.groupId,
        siteId: orgInfo.siteId
      })

      if (isNewFlow) {
        const created = await createTaskFlowAsync(payload)
        setSaveDoneOpen(true)
        await syncAfterCreate(created)
        return
      }

      if (!idForUpdate) return

      await updateTaskFlowAsync({ id: idForUpdate, patch: payload })

      setSaveDoneOpen(true)
      await refreshSelectedFlow()
    } catch (e: any) {
      console.error('[SAVE] failed:', e)

      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t('canvas.page.saveError')

      setSaveErrorMessage(msg)
      setSaveErrorOpen(true)
    } finally {
      setSaving(false)
      setSubmitState(null)
    }
  }

  const runBtTransformForSave = async (mode: SaveMode, override?: SaveOverride) => {
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

      await doSave(mode, result.xml ?? '', override)

      return true
    } catch (error: any) {
      console.error('[BT 변환] failed:', error)

      const message =
        error?.message ||
        (typeof error === 'string' ? error : t('canvas.page.btUnknownError'))

      setPendingBehaviorTree('')
      setBtModalMode('save-gate')
      setBtModalStatus('error')
      setBtModalTitle(t('canvas.page.btFailTitle'))
      setBtModalMessage(message)
      setBtModalOpen(true)

      return false
    }
  }

  const requestSave = async (mode: SaveMode, override?: SaveOverride) => {
    if (saving) return

    const trimmedName = (override?.name ?? flowName).trim()
    if (!trimmedName) {
      saveAfterInfoRef.current = mode
      setInfoDialogOpen(true)
      return
    }

    const orgInfo = validateOrganization()
    if (!orgInfo) {
      return
    }

    setSaveMode(mode)

    if (mode === 'temp') {
      await doSave('temp', undefined, override)
      return
    }

    if (!validateMoveToMapId()) {
      return
    }

    runBtTransformForSave(mode, override)
  }

  const onSave = () => requestSave('save')
  const onTempSave = () => requestSave('temp')

  useEffect(() => {
    const onTaskflowCanvasCommand = (event: Event) => {
      const custom = event as CustomEvent<any>
      const command = custom?.detail?.command
      if (!command || typeof command !== 'object') return

      const type = String(command?.type ?? '').trim().toLowerCase()
      if (!type) return

      if (type === 'save') {
        void requestSave('save')
        return
      }

      if (type === 'temp-save' || type === 'tempsave') {
        void requestSave('temp')
        return
      }

      if (type === 'set-flow-mode') {
        const modeRaw = String(command?.mode ?? '').trim().toLowerCase()
        const mode = modeRaw === 'tree' || modeRaw === 'vertical' || modeRaw === '세로'
          ? 'tree'
          : 'default'
        setFlowModeFromStore(mode)
        return
      }

      if (type === 'align') {
        alignSelectedNodesAuto()
      }
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    }
  }, [requestSave, setFlowModeFromStore, alignSelectedNodesAuto])

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
        description={flowDescription}
        title={isNewFlow ? flowName || t('canvas.page.newFlowTitle') : flowName || t('canvas.page.defaultTitle')}
        status={(selectedFlow as any)?.status}
        onEditInfo={() => {
          saveAfterInfoRef.current = null
          setInfoDialogOpen(true)
        }}
        onSave={onSave}
        onTempSave={onTempSave}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving && saveMode === 'save'}
        tempSaving={saving && saveMode === 'temp'}
      />

      <Main>
        <PanelLayout
          left={
            <PalettePanel
              groupId={selectedGroupId}
              siteId={selectedSiteId}
            />
          }
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
          saveAfterInfoRef.current = null
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

          const pendingMode = saveAfterInfoRef.current
          saveAfterInfoRef.current = null
          if (pendingMode) {
            void requestSave(pendingMode, { name, description })
          }
        }}
      />

      <ConfirmModal
        open={btModalOpen}
        title={btModalTitle}
        description={btModalMessage}
        confirmText={
          btModalStatus === 'success' && btModalMode === 'save-gate'
            ? saveMode === 'temp'
              ? saving
                ? t('canvas.page.btTempSaving')
                : t('canvas.page.btTempSave')
              : saving
                ? t('canvas.page.btSaving')
                : t('canvas.page.btSave')
            : t('common:confirm')
        }
        showCancelButton={btModalStatus === 'success' && btModalMode === 'save-gate'}
        confirmDisabled={saving}
        onCancel={() => {
          if (saving) return
          setBtModalOpen(false)
          setBtModalMode(null)
        }}
        onConfirm={async () => {
          if (saving) return

          if (btModalStatus === 'success' && btModalMode === 'save-gate') {
            setBtModalOpen(false)
            await doSave(saveMode, pendingBehaviorTree)
            return
          }

          setBtModalOpen(false)
          setBtModalMode(null)
        }}
      />

      <ConfirmModal
        open={saveDoneOpen}
        title={saveMode === 'temp' ? t('canvas.page.tempSaveDoneTitle') : t('canvas.page.saveDoneTitle')}
        description={
          saveMode === 'temp'
            ? t('canvas.page.tempSaveDoneDesc')
            : t('canvas.page.saveDoneDesc')
        }
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveDoneOpen(false)}
        onConfirm={() => setSaveDoneOpen(false)}
      />

      <ConfirmModal
        open={saveErrorOpen}
        title={submitState === 'temp' ? t('canvas.page.tempSaveFailTitle') : t('canvas.page.saveFailTitle')}
        description={saveErrorMessage}
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setSaveErrorOpen(false)}
        onConfirm={() => setSaveErrorOpen(false)}
      />
    </PageRoot>
  )
}