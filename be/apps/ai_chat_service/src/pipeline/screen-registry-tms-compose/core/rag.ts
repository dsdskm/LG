import { getPromptStore } from '../../../db/prompt-store.service'
import { safeJsonParse } from '../../../utils/utils'
import {
  type FlowContextSummary,
  type FlowContextTaskContentSummary,
  isContentTaskContent,
  normalizeMessageKey,
  normalizeNameKey,
  resolveControlTaskContentCandidate,
} from './base'

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

function resolveContentTaskCandidate(
  taskContents: FlowContextTaskContentSummary[],
  wantedTaskName: unknown,
  wantedLabel: unknown,
  usedKeys: Set<string>,
): FlowContextTaskContentSummary | null {
  const contentCandidates = taskContents.filter((item) => isContentTaskContent(item))
  if (contentCandidates.length === 0) return null

  const wantedTask = normalizeNameKey(wantedTaskName)
  const wantedName = normalizeNameKey(wantedLabel)

  const candidateKey = (item: FlowContextTaskContentSummary) => `${item.taskId ?? '-'}:${item.contentId ?? '-'}:${item.label ?? ''}`
  const available = contentCandidates.filter((item) => !usedKeys.has(candidateKey(item)))
  const pool = available.length > 0 ? available : contentCandidates

  const byTask = pool.find((item) => {
    const task = normalizeNameKey(item.taskName)
    return Boolean(wantedTask) && (task.includes(wantedTask) || wantedTask.includes(task))
  })
  if (byTask) {
    usedKeys.add(candidateKey(byTask))
    return byTask
  }

  const byName = pool.find((item) => {
    const label = normalizeNameKey(item.label)
    const contentName = normalizeNameKey(item.contentName)
    return Boolean(wantedName) && (
      label.includes(wantedName) || wantedName.includes(label) ||
      contentName.includes(wantedName) || wantedName.includes(contentName)
    )
  })
  if (byName) {
    usedKeys.add(candidateKey(byName))
    return byName
  }

  const fallback = pool[0]
  if (!fallback) return null
  usedKeys.add(candidateKey(fallback))
  return fallback
}

function parseRagTaskflowTemplate(chunkBody: string): RagTaskflowTemplate | null {
  const parsed = safeJsonParse(chunkBody)
  if (!parsed || typeof parsed !== 'object') return null

  const row = parsed as Record<string, unknown>
  const canvasDraft = (
    row.canvasDraft && typeof row.canvasDraft === 'object'
      ? (row.canvasDraft as Record<string, unknown>)
      : row.flowDefinition && typeof row.flowDefinition === 'object'
        ? (row.flowDefinition as Record<string, unknown>)
        : null
  )
  if (!canvasDraft) return null

  const nodes = Array.isArray(canvasDraft.nodes)
    ? (canvasDraft.nodes as Array<Record<string, unknown>>)
    : null
  const edges = Array.isArray(canvasDraft.edges)
    ? (canvasDraft.edges as Array<Record<string, unknown>>)
    : null
  if (!nodes || !edges || nodes.length === 0) return null

  const templateKey = String(row.templateKey ?? row.kind ?? '').trim()
  if (!templateKey) return null

  const triggerPhrases = Array.isArray(row.triggerPhrases)
    ? row.triggerPhrases.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []

  const flowMode = canvasDraft.flowMode === 'tree' ? 'tree' : 'default'
  const layout = String(canvasDraft.layout ?? 'manual').trim() || 'manual'

  return {
    templateKey,
    triggerPhrases,
    assistantText: String(row.assistantText ?? '').trim() || undefined,
    behaviorTreeXml: String(row.behaviorTreeXml ?? '').trim() || undefined,
    canvasDraft: {
      nodes,
      edges,
      viewport:
        canvasDraft.viewport && typeof canvasDraft.viewport === 'object' && !Array.isArray(canvasDraft.viewport)
          ? (canvasDraft.viewport as Record<string, unknown>)
          : { x: 0, y: 0, zoom: 1 },
      flowMode,
      layout,
    },
  }
}

function loadRagTaskflowTemplates(): RagTaskflowTemplate[] {
  const store = getPromptStore()
  const collection = store?.getCollection('tms/taskflows/:taskFlowId/canvas')
  if (!collection || !Array.isArray(collection.chunks)) return []

  return collection.chunks
    .map((chunk) => parseRagTaskflowTemplate(String(chunk?.body ?? '')))
    .filter((template): template is RagTaskflowTemplate => Boolean(template))
}

function pickRagTaskflowTemplate(message: string, templates: RagTaskflowTemplate[]): RagTaskflowTemplate | null {
  const normalizedMessage = normalizeMessageKey(message)
  if (!normalizedMessage) return null

  for (const template of templates) {
    const triggerMatch = template.triggerPhrases.some((phrase) => {
      const trigger = normalizeMessageKey(phrase)
      return Boolean(trigger) && normalizedMessage.includes(trigger)
    })
    if (triggerMatch) return template
  }

  return templates.find((template) => normalizedMessage.includes(normalizeMessageKey(template.templateKey))) ?? null
}

function buildDraftFromRagTemplate(
  flowContext: FlowContextSummary | null,
  template: RagTaskflowTemplate,
): Record<string, unknown> | null {
  const hasTemplateRole = template.canvasDraft.nodes.some((node) => {
    const dataInput = node?.data && typeof node.data === 'object' && !Array.isArray(node.data)
      ? (node.data as Record<string, unknown>)
      : {}
    return Boolean(normalizeNameKey(dataInput.templateRole ?? dataInput.role))
  })

  if (!hasTemplateRole) {
    return {
      mode: 'replace',
      layout: template.canvasDraft.layout ?? 'manual',
      flowMode: template.canvasDraft.flowMode === 'tree' ? 'tree' : 'default',
      nodes: template.canvasDraft.nodes,
      edges: template.canvasDraft.edges,
      viewport: template.canvasDraft.viewport ?? { x: 0, y: 0, zoom: 1 },
    }
  }

  const taskContents = Array.isArray(flowContext?.taskContents) ? flowContext.taskContents : []
  if (taskContents.length === 0) {
    return {
      mode: 'replace',
      layout: template.canvasDraft.layout ?? 'manual',
      flowMode: template.canvasDraft.flowMode === 'tree' ? 'tree' : 'default',
      nodes: template.canvasDraft.nodes,
      edges: template.canvasDraft.edges,
      viewport: template.canvasDraft.viewport ?? { x: 0, y: 0, zoom: 1 },
    }
  }

  const usedContentKeys = new Set<string>()

  const mappedNodes = template.canvasDraft.nodes.map((node) => {
    const dataInput = node?.data && typeof node.data === 'object' && !Array.isArray(node.data)
      ? (node.data as Record<string, unknown>)
      : {}
    const role = normalizeNameKey(dataInput.templateRole ?? dataInput.role)
    const taskType = normalizeNameKey(dataInput.taskType)

    const isControlRole = role.includes('control') || taskType === 'control'
    if (isControlRole) {
      const control = resolveControlTaskContentCandidate(taskContents, dataInput.taskName, template.templateKey)
      if (!control) return { ...node, data: dataInput }

      return {
        ...node,
        data: {
          ...dataInput,
          label: control.label ?? control.taskName ?? dataInput.label,
          taskId: control.taskId,
          taskName: control.taskName,
          taskType: 'CONTROL',
          contentId: undefined,
          contentName: undefined,
        },
      }
    }

    const isActionRole = role.includes('action') || taskType === 'action'
    if (isActionRole) {
      const picked = resolveContentTaskCandidate(
        taskContents,
        dataInput.taskName,
        dataInput.contentName ?? dataInput.label,
        usedContentKeys,
      )
      if (!picked) return node

      return {
        ...node,
        data: {
          ...dataInput,
          label: picked.label ?? picked.contentName ?? dataInput.label,
          taskId: picked.taskId,
          taskName: picked.taskName ?? dataInput.taskName,
          taskType: 'ACTION',
          contentId: picked.contentId,
          contentName: picked.contentName ?? picked.label,
        },
      }
    }

    return {
      ...node,
      data: dataInput,
    }
  })

  return {
    mode: 'replace',
    layout: template.canvasDraft.layout ?? 'manual',
    flowMode: template.canvasDraft.flowMode === 'tree' ? 'tree' : 'default',
    nodes: mappedNodes,
    edges: template.canvasDraft.edges,
    viewport: template.canvasDraft.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}


export {
  buildDraftFromRagTemplate,
  loadRagTaskflowTemplates,
  pickRagTaskflowTemplate,
}
