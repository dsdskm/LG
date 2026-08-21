import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAiAssistantStore, useUserStore, useOrganizationStore, useAiLogEventStore } from '@repo/stores'
import { getAppPrefix } from '@repo/utils'
import {
  getChatSettings,
  getGuidanceList,
  saveLocalChatHistory,
  listChatRules,
} from '@repo/apis/ai/chatSettings.js'
import Icon from '../../common/Icon'
import {
  StyledAiAssistantComposer,
  StyledAiAssistantDock,
  StyledAiFloatingTrigger,
  StyledAiAssistantDockBody,
  StyledAiAssistantDockHeader,
  StyledAiAssistantDockToggle,
  StyledAiAssistantLoadingBubble,
  StyledAiAssistantLoadingDots,
  StyledAiAssistantLoadingRow,
  StyledAiAssistantLoadingText,
  StyledAiAssistantMessage,
  StyledAiAssistantMessageBubble,
  StyledAiAssistantImage,
  StyledAiAssistantImageCaption,
  StyledAiAssistantImageCard,
  StyledAiAssistantImageList,
  StyledAiAssistantImageText,
  StyledAiAssistantImageTitle,
  StyledAiAssistantMessageList,
  StyledAiAssistantMessageMeta,
  StyledAiAssistantPipelineTrace,
  StyledAiAssistantTextarea,
  StyledAiBotAvatar,
  StyledAiComposerBox,
  StyledAiComposerFooter,
  StyledAiContextChip,
  StyledAiContextChips,
  StyledAiDisclaimer,
  StyledAiGreeting,
  StyledAiGreetingCta,
  StyledAiGreetingLine,
  StyledAiHeaderActions,
  StyledAiHeaderLeft,
  StyledAiSendButton,
  StyledAiAssistantPanelTitle,
  StyledAiActionCards,
  StyledAiActionCard,
  StyledAiActionCardTitle,
  StyledAiActionCardKeyword,
  StyledAiStopButton
} from './styles'
import { postSiteAssistantChat } from '@repo/apis/ai/chat.js'
import { isTmsCanvasPath, loadTmsAppRules } from './taskflowCommandRules.js'
import {
  isCommandHelpRequest,
  extractCommandHelpEntries,
  buildCommandHelpReplyText,
} from './screenCommandHelp.js'
import {
  AI_TASKFLOW_CANVAS_CLARIFY_EVENT,
  AI_TASKFLOW_CANVAS_COMMAND_EVENT,
  AI_TASKFLOW_CANVAS_DRAFT_EVENT,
  AI_TASKFLOW_CANVAS_RESULT_EVENT
} from './taskflowEvents.js'

const ENABLE_QUICK_COMMANDS = true
const ENABLE_MESSAGE_SUGGESTED_ACTIONS = false
const AI_CHAT_SERVICE_URL = String(import.meta.env.VITE_AI_CHAT_SERVICE_URL ?? '')
  .trim()
  .replace(/\/$/, '')

const SENDING_STAGE = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  SCREEN_CHECK: 'screen-check',
  INTENT: 'intent',
  INFO_RAG: 'info-rag',
  COMMON_RAG: 'common-rag',
  TOOL: 'tool',
  ASSEMBLING: 'assembling',
  COMPLETED: 'completed',
  NODE_WORKING: 'node-working'
}

const SENDING_STAGE_LABEL = {
  [SENDING_STAGE.REQUESTING]: '요청중',
  [SENDING_STAGE.SCREEN_CHECK]: '화면/컨텍스트 확인중',
  [SENDING_STAGE.INTENT]: '의도 분기중',
  [SENDING_STAGE.INFO_RAG]: '해당 화면의 RAG 조회중...',
  [SENDING_STAGE.COMMON_RAG]: '공통 RAG 조회중...',
  [SENDING_STAGE.TOOL]: '공통 action 툴 확인중...',
  [SENDING_STAGE.ASSEMBLING]: '응답 조립중...',
  [SENDING_STAGE.COMPLETED]: '응답완료',
  [SENDING_STAGE.NODE_WORKING]: '노드 작업을 진행중입니다.'
}

const inferSendingMode = (message) => {
  const text = String(message ?? '').trim()
  if (!text) return 'info'

  if (
    /\b(taskflow|parallel|ifthenelse|repeat|move|navigate|node|노드|이동|연결|병렬|반복|추가|생성|수정|삭제|저장|실행|바꿔|변경)\b/i.test(
      text
    )
  ) {
    return 'action'
  }

  return 'info'
}

const buildSendingStagePlan = (message) => {
  const mode = inferSendingMode(message)

  if (mode === 'action') {
    return [
      SENDING_STAGE.REQUESTING,
      SENDING_STAGE.SCREEN_CHECK,
      SENDING_STAGE.INTENT,
      SENDING_STAGE.INFO_RAG,
      SENDING_STAGE.COMMON_RAG,
      SENDING_STAGE.TOOL,
      SENDING_STAGE.ASSEMBLING
    ]
  }

  return [
    SENDING_STAGE.REQUESTING,
    SENDING_STAGE.SCREEN_CHECK,
    SENDING_STAGE.INTENT,
    SENDING_STAGE.INFO_RAG,
    SENDING_STAGE.COMMON_RAG,
    SENDING_STAGE.ASSEMBLING
  ]
}

const TYPEWRITER_INTERVAL_MS = 110
const ASSISTANT_TYPEWRITER_INTERVAL_MS = 24

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const pickRandomItems = (items, count) => {
  const list = Array.isArray(items) ? [...items] : []
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list.slice(0, count)
}

const pickRandomItem = (items) => {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  if (list.length <= 0) return ''
  const index = Math.floor(Math.random() * list.length)
  return String(list[index] ?? '').trim()
}

const parseInputHintCandidates = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? '').trim()).filter(Boolean)
    }
  } catch {
    // JSON 배열이 아니면 일반 텍스트로 처리
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

const normalizeRouteKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^\/+/, '')

const normalizeNavigationPath = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const withoutSlash = raw.replace(/^\/+/, '')
  if (!withoutSlash) return '/'

  const hasLeadingAppSegment = /^[a-z0-9_-]+\//i.test(withoutSlash)
  if (hasLeadingAppSegment) return `/${withoutSlash}`

  return `/${withoutSlash}`
}

const routeTemplateMatches = (templateKey, currentPath) => {
  const template = normalizeRouteKey(templateKey)
  const target = normalizeRouteKey(currentPath)
  if (!template || !target) return false
  if (template === 'common') return true

  const templateSegments = template.split('/').filter(Boolean)
  const targetSegments = target.split('/').filter(Boolean)
  if (templateSegments.length > targetSegments.length) return false

  for (let i = 0; i < templateSegments.length; i += 1) {
    const tpl = templateSegments[i]
    const cur = targetSegments[i]
    if (!cur) return false
    if (tpl.startsWith(':')) continue
    if (tpl !== cur) return false
  }

  return true
}

const findGuidanceExamplesForPath = (guidanceItems, pathname) => {
  const normalizedPath = normalizeRouteKey(pathname)
  if (!normalizedPath) return []

  const extractExampleTexts = (examples) =>
    (Array.isArray(examples) ? examples : [])
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        return String(item?.q ?? '').trim()
      })
      .filter(Boolean)

  const uniqueTexts = (items) => {
    const seen = new Set()
    return items.filter((text) => {
      if (seen.has(text)) return false
      seen.add(text)
      return true
    })
  }

  const entries = (Array.isArray(guidanceItems) ? guidanceItems : [])
    .map((item) => {
      const key = normalizeRouteKey(item?.screenKey ?? item?.key ?? item?.routeKey ?? item?.screenName ?? '')
      const examples = Array.isArray(item?.examples) ? item.examples : []
      return {
        key,
        examples,
        appKey: String(item?.appKey ?? '').trim().toLowerCase(),
        isCommon: String(item?.appKey ?? '').trim().toLowerCase() === 'common' || key === 'common'
      }
    })
    .filter((item) => item.key && item.examples.length > 0)

  const scopedCandidates = entries
    .filter((item) => item.key !== 'common' && routeTemplateMatches(item.key, normalizedPath))
    .sort((left, right) => right.key.length - left.key.length)

  for (const candidate of scopedCandidates) {
    const texts = uniqueTexts(extractExampleTexts(candidate.examples))
    if (texts.length > 0) return texts
  }

  const commonHint = entries.find((item) => item.isCommon)
  if (commonHint) {
    return uniqueTexts(extractExampleTexts(commonHint.examples))
  }

  // 설정 페이지에서는 추천어를 노출하지 않는다.
  if (normalizedPath.endsWith('ai-chat-settings')) {
    return []
  }

  return []
}

const findInputHintForPath = (guidanceItems, pathname) => {
  const normalizedPath = normalizeRouteKey(pathname)
  const entries = (Array.isArray(guidanceItems) ? guidanceItems : [])
    .map((item) => {
      const key = normalizeRouteKey(item?.screenKey ?? item?.key ?? item?.routeKey ?? item?.screenName ?? '')
      const examples = Array.isArray(item?.examples) ? item.examples : []
      return {
        key,
        examples,
        appKey: String(item?.appKey ?? '').trim().toLowerCase(),
        isCommon: String(item?.appKey ?? '').trim().toLowerCase() === 'common' || key === 'common'
      }
    })
    .filter((item) => item.key && item.examples.length > 0)

  const pickExampleText = (examples) => {
    const texts = (Array.isArray(examples) ? examples : [])
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        return String(item?.q ?? '').trim()
      })
      .filter(Boolean)

    return pickRandomItem(texts) || texts[0] || ''
  }

  const scopedCandidates = entries
    .filter((item) => item.key !== 'common' && routeTemplateMatches(item.key, normalizedPath))
    .sort((left, right) => right.key.length - left.key.length)

  if (scopedCandidates[0]) {
    const picked = pickExampleText(scopedCandidates[0].examples)
    if (picked) return picked
  }

  const commonHint = entries.find((item) => item.isCommon)
  if (commonHint) {
    const picked = pickExampleText(commonHint.examples)
    if (picked) return picked
  }

  return ''
}

const buildMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const normalizeAppPrefix = (pathname) => {
  const raw = getAppPrefix(pathname)
  if (!raw || raw === '/') return ''
  return String(raw).replace(/^\//, '')
}

const buildRouteContext = (location) => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
  appPrefix: normalizeAppPrefix(location.pathname),
  title: typeof document !== 'undefined' ? document.title : ''
})

const parseTaskflowIdFromPath = (pathname) => {
  const matched = String(pathname ?? '')
    .trim()
    .match(/^\/tms\/taskflows\/(\d+)\/canvas(?:\/|$)/)
  if (!matched) return null
  const id = Number(matched[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

const normalizeNodeLabel = (node) => {
  const data = node?.data ?? {}
  return String(data.label ?? data.contentName ?? data.taskName ?? '').trim()
}

const buildLinearOrderLabels = (nodes, edges) => {
  const byId = new Map(nodes.map((node) => [String(node.id), node]))
  const outgoing = new Map()

  for (const edge of Array.isArray(edges) ? edges : []) {
    const source = String(edge?.source ?? '')
    const target = String(edge?.target ?? '')
    if (!byId.has(source) || !byId.has(target)) continue
    const list = outgoing.get(source) ?? []
    list.push(target)
    outgoing.set(source, list)
  }

  const visited = new Set()
  const ordered = []
  let cursor = 'start'

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    const outs = outgoing.get(cursor) ?? []
    if (!Array.isArray(outs) || outs.length !== 1) break
    const nextId = String(outs[0])
    if (nextId === 'start') break
    const node = byId.get(nextId)
    if (!node) break
    const label = normalizeNodeLabel(node)
    if (label) ordered.push(label)
    cursor = nextId
  }

  return ordered
}

const buildTaskListFromTaskPanel = (items) => {
  const uniq = new Map()

  for (const item of Array.isArray(items) ? items : []) {
    const taskId = Number(item?.taskId)
    if (!Number.isFinite(taskId) || taskId <= 0) continue

    const taskName = String(item?.taskName ?? '').trim()
    const label = String(item?.label ?? taskName).trim()
    const key = `${taskId}:${taskName || label}`
    if (!label || uniq.has(key)) continue

    uniq.set(key, {
      taskId,
      label,
      taskName: taskName || undefined
    })
  }

  return Array.from(uniq.values())
}

const buildTaskContentsFromTaskPanel = (items) => {
  const uniq = new Map()

  for (const item of Array.isArray(items) ? items : []) {
    const taskId = Number(item?.taskId)
    const label = String(item?.label ?? '').trim()
    if (!Number.isFinite(taskId) || taskId <= 0 || !label) continue

    const taskName = String(item?.taskName ?? '').trim()
    const contentIdRaw = Number(item?.contentId)
    const contentId = Number.isFinite(contentIdRaw) && contentIdRaw > 0 ? contentIdRaw : undefined
    const contentName = String(item?.contentName ?? '').trim() || undefined
    const kind = String(item?.kind ?? '').trim()

    const key = `${taskId}:${contentId ?? '-'}:${label}:${taskName}`
    if (uniq.has(key)) continue

    uniq.set(key, {
      kind,
      taskId,
      taskName: taskName || undefined,
      label,
      contentId,
      contentName
    })
  }

  return Array.from(uniq.values())
}

const buildTaskflowFlowContext = (pathname) => {
  if (!isTmsCanvasPath(pathname)) return undefined
  if (typeof window === 'undefined') return undefined

  const taskFlowId = parseTaskflowIdFromPath(pathname)
  if (!taskFlowId) return undefined

  try {
    const runtimeContext = window.__AI_TASKFLOW_CONTEXT__
    if (!runtimeContext || Number(runtimeContext?.taskFlowId ?? 0) !== Number(taskFlowId)) {
      return undefined
    }

    const nodes = Array.isArray(runtimeContext?.nodes) ? runtimeContext.nodes : []
    const taskNodes = nodes.filter((node) => String(node?.id ?? '') !== 'start')
    const edges = Array.isArray(runtimeContext?.edges) ? runtimeContext.edges : []
    if (nodes.length === 0) return undefined

    const addableNodes = Array.isArray(runtimeContext?.addableNodes) ? runtimeContext.addableNodes : []
    const taskList = Array.isArray(runtimeContext?.taskList)
      ? runtimeContext.taskList
      : buildTaskListFromTaskPanel(addableNodes)
    const taskContents = Array.isArray(runtimeContext?.taskContents)
      ? runtimeContext.taskContents
      : Array.isArray(runtimeContext?.taskcontents)
        ? runtimeContext.taskcontents
        : buildTaskContentsFromTaskPanel(addableNodes)

    const outgoingCount = new Map(nodes.map((node) => [String(node.id), 0]))
    for (const edge of edges) {
      const source = String(edge?.source ?? '')
      if (!outgoingCount.has(source)) continue
      outgoingCount.set(source, Number(outgoingCount.get(source) ?? 0) + 1)
    }

    const tails = taskNodes
      .filter((node) => Number(outgoingCount.get(String(node.id)) ?? 0) === 0)
      .map((node) => normalizeNodeLabel(node))
      .filter(Boolean)

    const branchingCount = Array.from(outgoingCount.values()).filter((count) => count > 1).length

    return {
      taskFlowId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      tails: tails.slice(0, 8),
      branchingCount,
      ambiguousInsertion: tails.length !== 1 || branchingCount > 0,
      linearOrder: buildLinearOrderLabels(nodes, edges),
      addableNodes,
      taskList,
      taskContents,
      nodes: nodes
        .map((node) => ({
          id: String(node?.id ?? '').trim(),
          label: normalizeNodeLabel(node) || (String(node?.id ?? '') === 'start' ? 'start' : ''),
          nodeType: String(node?.type ?? '').trim(),
          taskName: String(node?.data?.taskName ?? '').trim(),
          contentName: String(node?.data?.contentName ?? '').trim()
        }))
        .filter((node) => node.id),
      flowDefinition: {
        nodes,
        edges,
        viewport:
          runtimeContext?.viewport &&
          typeof runtimeContext.viewport === 'object' &&
          !Array.isArray(runtimeContext.viewport)
            ? runtimeContext.viewport
            : { x: 0, y: 0, zoom: 1 },
        flowMode: runtimeContext?.flowMode === 'tree' ? 'tree' : 'default'
      },
      fullFlow: {
        nodes,
        edges,
        viewport:
          runtimeContext?.viewport &&
          typeof runtimeContext.viewport === 'object' &&
          !Array.isArray(runtimeContext.viewport)
            ? runtimeContext.viewport
            : { x: 0, y: 0, zoom: 1 },
        flowMode: runtimeContext?.flowMode === 'tree' ? 'tree' : 'default'
      }
    }
  } catch {
    return undefined
  }
}

const buildTaskflowRequestContext = (flowContext) => {
  if (!flowContext || typeof flowContext !== 'object') return undefined

  const flowForEdges = flowContext?.fullFlow ?? flowContext?.flowDefinition
  const flowModeSource = flowContext?.fullFlow ?? flowContext?.flowDefinition ?? flowContext

  return {
    taskFlowId: Number(flowContext?.taskFlowId ?? 0) || undefined,
    flowMode: String(flowModeSource?.flowMode ?? 'default'),
    nodeCount: Number(flowContext?.nodeCount ?? 0),
    edgeCount: Number(flowContext?.edgeCount ?? 0),
    branchingCount: Number(flowContext?.branchingCount ?? 0),
    tails: Array.isArray(flowContext?.tails) ? flowContext.tails : [],
    ambiguousInsertion: Boolean(flowContext?.ambiguousInsertion),
    linearOrder: Array.isArray(flowContext?.linearOrder) ? flowContext.linearOrder : [],
    taskList: Array.isArray(flowContext?.taskList) ? flowContext.taskList : [],
    taskContents: Array.isArray(flowContext?.taskContents) ? flowContext.taskContents : [],
    currentNodeList: Array.isArray(flowContext?.nodes) ? flowContext.nodes : [],
    currentEdgeList: Array.isArray(flowForEdges?.edges)
      ? flowForEdges.edges.map((edge) => ({
          id: String(edge?.id ?? ''),
          source: String(edge?.source ?? ''),
          target: String(edge?.target ?? ''),
          sourceHandle: String(edge?.sourceHandle ?? ''),
          targetHandle: String(edge?.targetHandle ?? '')
        }))
      : [],
    fullFlow: flowContext?.fullFlow && typeof flowContext.fullFlow === 'object' ? flowContext.fullFlow : undefined,
    addableNodes: Array.isArray(flowContext?.addableNodes) ? flowContext.addableNodes : []
  }
}

const extractTaskflowDraftParam = (value) => {
  if (!value || typeof value !== 'object') return null

  const row = value
  const wrapped = row.chat_action_param && typeof row.chat_action_param === 'object' ? row.chat_action_param : row.chatActionParam && typeof row.chatActionParam === 'object' ? row.chatActionParam : row

  if (wrapped.canvasDraft && typeof wrapped.canvasDraft === 'object') return wrapped.canvasDraft
  if (wrapped.taskflowDraft && typeof wrapped.taskflowDraft === 'object') return wrapped.taskflowDraft
  if (wrapped.draft && typeof wrapped.draft === 'object') return wrapped.draft
  if (wrapped.canvas && typeof wrapped.canvas === 'object') return wrapped.canvas
  if (wrapped.flowDefinition && typeof wrapped.flowDefinition === 'object') return wrapped.flowDefinition

  if (wrapped.toolResult && typeof wrapped.toolResult === 'object') {
    const nested = extractTaskflowDraftParam(wrapped.toolResult)
    if (nested) return nested
  }

  if (wrapped.executed && typeof wrapped.executed === 'object') {
    const nested = extractTaskflowDraftParam(wrapped.executed)
    if (nested) return nested
  }

  return null
}

const extractTaskflowCanvasCommandParam = (value) => {
  if (!value || typeof value !== 'object') return null

  const row = value
  const wrapped = row.chat_action_param && typeof row.chat_action_param === 'object' ? row.chat_action_param : row.chatActionParam && typeof row.chatActionParam === 'object' ? row.chatActionParam : row
  if (wrapped.canvasCommand && typeof wrapped.canvasCommand === 'object') return wrapped.canvasCommand

  if (wrapped.toolResult && typeof wrapped.toolResult === 'object') {
    const nested = extractTaskflowCanvasCommandParam(wrapped.toolResult)
    if (nested) return nested
  }

  if (wrapped.executed && typeof wrapped.executed === 'object') {
    const nested = extractTaskflowCanvasCommandParam(wrapped.executed)
    if (nested) return nested
  }

  return null
}

const extractAssistantText = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload) return '응답을 받았지만 표시할 수 있는 내용이 없습니다.'
  if (typeof payload === 'string') return payload
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim()
  if (typeof payload?.content === 'string' && payload.content.trim()) return payload.content.trim()
  if (typeof payload?.text === 'string' && payload.text.trim()) return payload.text.trim()
  if (typeof payload?.answer === 'string' && payload.answer.trim()) return payload.answer.trim()
  return '응답을 받았지만 표시할 수 있는 내용이 없습니다.'
}

const extractPipelineTrace = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload || typeof payload !== 'object') return ''

  const directTrace = String(payload?.pipelineTrace ?? payload?.pipeline_trace ?? '').trim()
  if (directTrace) return directTrace

  const param = payload?.chat_action_param
  if (!param || typeof param !== 'object') return ''

  return String(param?.pipelineTrace ?? param?.pipeline_trace ?? '').trim()
}

const extractPipelineConfidence = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload || typeof payload !== 'object') return undefined

  const direct = Number(payload?.pipelineConfidence)
  if (Number.isFinite(direct)) return direct

  const param = payload?.chat_action_param
  if (!param || typeof param !== 'object') return undefined
  const nested = Number(param?.pipelineConfidence)
  return Number.isFinite(nested) ? nested : undefined
}

const extractRagMatchInfo = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload || typeof payload !== 'object') {
    return { usedCollection: '', usedChunkKeys: [], ragScores: [] }
  }

  const usedCollection = String(payload?.usedCollection ?? '').trim()
  const usedChunks = Array.isArray(payload?.usedChunks) ? payload.usedChunks : []
  const ragScores = Array.isArray(payload?.ragScores) ? payload.ragScores : []

  return {
    usedCollection,
    usedChunkKeys: usedChunks.map((item) => String(item ?? '').trim()).filter(Boolean),
    ragScores: ragScores.map((item) => ({
      collection: String(item?.collection ?? '').trim(),
      topScore: Number(item?.topScore ?? 0),
      adjustedScore: Number(item?.adjustedScore ?? 0),
      hitCount: Number(item?.hitCount ?? 0),
      topChunkIds: Array.isArray(item?.topChunkIds)
        ? item.topChunkIds.map((chunkId) => String(chunkId ?? '').trim()).filter(Boolean)
        : [],
      relaxed: Boolean(item?.relaxed)
    }))
  }
}

const extractMatchedRuleInfo = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload || typeof payload !== 'object') {
    return {
      source: '',
      ruleKey: '',
      ruleType: '',
      reason: '',
      confidence: undefined
    }
  }

  const direct = payload?.matchedRule && typeof payload.matchedRule === 'object' ? payload.matchedRule : undefined
  const nested =
    payload?.chat_action_param?.matchedRule && typeof payload.chat_action_param.matchedRule === 'object'
      ? payload.chat_action_param.matchedRule
      : undefined
  const row = direct ?? nested ?? {}

  const confidence = Number(row?.confidence)
  return {
    source: String(row?.source ?? '').trim(),
    ruleKey: String(row?.ruleKey ?? '').trim() || String(payload?.chat_action_param?.matchedRuleKey ?? '').trim(),
    ruleType: String(row?.ruleType ?? '').trim(),
    reason: String(row?.reason ?? '').trim(),
    confidence: Number.isFinite(confidence) ? confidence : undefined
  }
}

const resolveAssistantAssetUrl = (src) => {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value
  if (value.startsWith('/')) return AI_CHAT_SERVICE_URL ? `${AI_CHAT_SERVICE_URL}${value}` : value
  return AI_CHAT_SERVICE_URL ? `${AI_CHAT_SERVICE_URL}/${value.replace(/^\/+/, '')}` : value
}

const extractAssistantImages = (result) => {
  const payload = result?.data ?? result ?? null
  const list = Array.isArray(payload?.images) ? payload.images : []

  return list
    .map((item, idx) => {
      const src = resolveAssistantAssetUrl(item?.src ?? item?.url ?? item?.path)
      if (!src) return null

      return {
        id: String(item?.id ?? `assistant-image-${idx + 1}`),
        src,
        alt: String(item?.alt ?? item?.title ?? 'assistant image').trim(),
        title: String(item?.title ?? '').trim(),
        caption: String(item?.caption ?? '').trim()
      }
    })
    .filter(Boolean)
    .slice(0, 1)
}

const extractSuggestedActions = (result) => {
  if (!ENABLE_MESSAGE_SUGGESTED_ACTIONS) return []

  const payload = result?.data ?? result ?? null
  const list = payload?.chat_action_param?.suggested_actions
  if (!Array.isArray(list)) return []

  return list
    .map((item, idx) => {
      const id = String(item?.id ?? `suggested-${idx + 1}`)
      const label = String(item?.label ?? '').trim()
      const keyword = String(item?.keyword ?? '').trim()
      const chatAction = String(item?.chat_action ?? '').trim()
      const chatActionParam =
        item?.chat_action_param && typeof item.chat_action_param === 'object' ? item.chat_action_param : undefined

      if (!label || !chatAction) return null

      return {
        id,
        label,
        keyword,
        chatAction,
        chatActionParam
      }
    })
    .filter(Boolean)
    .slice(0, 3)
}

const PATH_PARAM_LABELS = {
  robotId: '로봇 아이디'
}

const extractPathParams = (path) => {
  const normalized = String(path ?? '')
    .trim()
    .replace(/^\/+/, '')
  if (!normalized) return []

  return normalized
    .split('/')
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1))
    .filter(Boolean)
}

const resolveParamLabel = (paramName) => {
  const key = String(paramName ?? '').trim()
  if (!key) return '필수 파라미터'
  if (PATH_PARAM_LABELS[key]) return PATH_PARAM_LABELS[key]
  return `${key} 값`
}

const fillPathTemplate = (pathTemplate, params) => {
  const normalized = String(pathTemplate ?? '')
    .trim()
    .replace(/^\/+/, '')
  if (!normalized) return ''

  return normalized.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
    const value = String(params?.[name] ?? '').trim()
    return encodeURIComponent(value)
  })
}

const parseNavigationParamInput = (text, paramNames) => {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null
  if (!Array.isArray(paramNames) || paramNames.length === 0) return {}

  if (paramNames.length === 1) {
    return { [paramNames[0]]: trimmed }
  }

  const parsed = {}
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean)
  for (const token of tokens) {
    const [key, ...rest] = token.split('=')
    if (!key || rest.length === 0) continue
    parsed[key.trim()] = rest.join('=').trim()
  }

  const hasAll = paramNames.every((name) => String(parsed[name] ?? '').trim())
  return hasAll ? parsed : null
}

const buildNavigationFallbackActions = (pathTemplate) => {
  const normalized = String(pathTemplate ?? '')
    .trim()
    .replace(/^\/+/, '')

  if (normalized.startsWith('robot/robots/:robotId/detail')) {
    return [
      {
        id: 'fallback-robot-management',
        label: '로봇 목록 화면으로 이동',
        keyword: '로봇 상세 이동이 어려우면 목록에서 직접 선택',
        chatAction: 'navigation',
        chatActionParam: { path: 'robot/management', app: 'robot' }
      }
    ]
  }

  return []
}

const STORAGE_KEY = 'ai-assistant-trigger-y'

const getInitialY = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return Math.max(60, Math.min(window.innerHeight - 60, parseInt(saved, 10)))
  } catch {}
  return Math.floor((typeof window !== 'undefined' ? window.innerHeight : 600) / 2)
}

function FloatingTrigger({ onClick }) {
  const [posY, setPosY] = useState(getInitialY)
  const posYRef = useRef(posY)
  const isDragging = useRef(false)
  const hasMoved = useRef(false)
  const dragStartClientY = useRef(0)
  const dragStartPosY = useRef(0)

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    const delta = e.clientY - dragStartClientY.current
    if (Math.abs(delta) > 4) hasMoved.current = true
    const next = Math.max(60, Math.min(window.innerHeight - 60, dragStartPosY.current + delta))
    posYRef.current = next
    setPosY(next)
  }, [])

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    try {
      localStorage.setItem(STORAGE_KEY, String(posYRef.current))
    } catch {}
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  const handleMouseDown = (e) => {
    e.preventDefault()
    isDragging.current = true
    hasMoved.current = false
    dragStartClientY.current = e.clientY
    dragStartPosY.current = posYRef.current
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleClick = () => {
    if (!hasMoved.current) onClick()
  }

  return (
    <StyledAiFloatingTrigger
      style={{ top: posY }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title="AI Assistant 열기"
    >
      ✦
    </StyledAiFloatingTrigger>
  )
}

const AiAssistantPanel = ({ greetingExtra, className, commandAdapter }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useUserStore((state) => state.session)
  const selectedOrgs = useOrganizationStore((state) => state.selectedOrgs)
  const currentEventFilters = useAiLogEventStore((state) => state.currentFilters)

  const isOpen = useAiAssistantStore((state) => state.isOpen)
  const openPanel = useAiAssistantStore((state) => state.openPanel)
  const closePanel = useAiAssistantStore((state) => state.closePanel)
  const messages = useAiAssistantStore((state) => state.messages)
  const appendMessage = useAiAssistantStore((state) => state.appendMessage)
  const updateMessageById = useAiAssistantStore((state) => state.updateMessageById)
  const resetMessages = useAiAssistantStore((state) => state.resetMessages)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendingStage, setSendingStage] = useState(SENDING_STAGE.IDLE)
  const [sendingElapsedSec, setSendingElapsedSec] = useState(0)
  const [typedStageLabel, setTypedStageLabel] = useState('')
  const [typedAssistantMessages, setTypedAssistantMessages] = useState({})
  const [pageContextOn, setPageContextOn] = useState(true)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const [screenSuggestions, setScreenSuggestions] = useState([])
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState('')
  const [isAssistantTyping, setIsAssistantTyping] = useState(false)

  const messageListRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const sendingStartedAtRef = useRef(null)
  const assistantTypingTimerRef = useRef(null)
  const assistantMessageContentRef = useRef(
    new Map(
      messages
        .filter((message) => message?.role === 'assistant' && message?.id)
        .map((message) => [String(message.id), String(message.content ?? '')])
    )
  )
  const sendingStagePlanRef = useRef(buildSendingStagePlan(''))
  const displayedStageRef = useRef(SENDING_STAGE.IDLE)
  const stageQueueRef = useRef([])
  const stageTypingTimerRef = useRef(null)
  const stageAdvanceTimerRef = useRef(null)
  const stageTypingIndexRef = useRef(0)
  const stageHoldUntilRef = useRef(0)
  const submitInFlightRef = useRef(false)
  // 멀티턴: 직전에 이벤트 표에 적용된 필터. 후속 발화("심각도 높음만") 병합 기준.
  const lastFiltersRef = useRef(null)

  const routeContext = useMemo(() => buildRouteContext(location), [location])
  const routeMetadataCacheRef = useRef(new Map())
  const routeAnswerCacheRef = useRef(new Map())
  const routeRuleDataCacheRef = useRef(new Map())

  const quickCommands = useMemo(
    () => pickRandomItems(screenSuggestions, Math.min(3, screenSuggestions.length)),
    [screenSuggestions, isOpen]
  )

  const enqueueSendingStage = (stage) => {
    if (!stage || stage === SENDING_STAGE.IDLE) return
    if (displayedStageRef.current === stage) return
    if (stageQueueRef.current.includes(stage)) return
    stageQueueRef.current.push(stage)
  }

  const processSendingStageQueue = () => {
    if (!isSending) return
    if (stageTypingTimerRef.current || stageAdvanceTimerRef.current) return

    const nextStage = stageQueueRef.current.shift()
    if (!nextStage) return

    displayedStageRef.current = nextStage
    const fullLabel = SENDING_STAGE_LABEL[nextStage] || '작업중'
    stageTypingIndexRef.current = 0
    setTypedStageLabel('')
    stageHoldUntilRef.current = Date.now() + Math.max(260, fullLabel.length * TYPEWRITER_INTERVAL_MS)

    stageTypingTimerRef.current = setInterval(() => {
      stageTypingIndexRef.current += 1
      setTypedStageLabel(fullLabel.slice(0, stageTypingIndexRef.current))

      if (stageTypingIndexRef.current >= fullLabel.length) {
        if (stageTypingTimerRef.current) {
          clearInterval(stageTypingTimerRef.current)
          stageTypingTimerRef.current = null
        }

        const wait = Math.max(0, stageHoldUntilRef.current - Date.now())
        stageAdvanceTimerRef.current = window.setTimeout(() => {
          stageAdvanceTimerRef.current = null
          processSendingStageQueue()
        }, wait)
      }
    }, TYPEWRITER_INTERVAL_MS)
  }

  const hasConversation = messages.some((m) => m.role === 'user')

  const userName = session?.email ? session.email.split('@')[0].replace(/[._-]/g, ' ') : null

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages, isSending, isOpen])

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (stageTypingTimerRef.current) {
        clearInterval(stageTypingTimerRef.current)
        stageTypingTimerRef.current = null
      }
      if (stageAdvanceTimerRef.current) {
        clearTimeout(stageAdvanceTimerRef.current)
        stageAdvanceTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isSending) return undefined

    const startedAt = Number(sendingStartedAtRef.current)
    if (!Number.isFinite(startedAt) || startedAt <= 0) return undefined

    const tick = () => {
      const elapsedMs = Math.max(0, Date.now() - startedAt)
      const plan =
        Array.isArray(sendingStagePlanRef.current) && sendingStagePlanRef.current.length > 0
          ? sendingStagePlanRef.current
          : buildSendingStagePlan('')
      const thresholds = [0, 450, 1100, 1800, 2600, 3600, 4800]

      let nextIndex = 0
      for (let index = 0; index < thresholds.length; index += 1) {
        if (elapsedMs >= thresholds[index]) nextIndex = index
      }

      const nextStage = plan[Math.min(nextIndex, plan.length - 1)] ?? SENDING_STAGE.REQUESTING
      setSendingStage(nextStage)
    }

    tick()
    const timer = setInterval(tick, 180)

    return () => {
      clearInterval(timer)
    }
  }, [isSending])

  useEffect(() => {
    if (!isSending) {
      setSendingElapsedSec(0)
      return undefined
    }

    const startedAt = Number(sendingStartedAtRef.current)
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      const now = Date.now()
      sendingStartedAtRef.current = now
      setSendingElapsedSec(0)
      return undefined
    }

    setSendingElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    const timer = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setSendingElapsedSec(elapsed)
    }, 200)

    return () => {
      clearInterval(timer)
    }
  }, [isSending])

  useEffect(() => {
    if (!isSending) {
      stageQueueRef.current = []
      displayedStageRef.current = SENDING_STAGE.IDLE
      stageTypingIndexRef.current = 0
      stageHoldUntilRef.current = 0
      setTypedStageLabel('')
      if (stageTypingTimerRef.current) {
        clearInterval(stageTypingTimerRef.current)
        stageTypingTimerRef.current = null
      }
      if (stageAdvanceTimerRef.current) {
        clearTimeout(stageAdvanceTimerRef.current)
        stageAdvanceTimerRef.current = null
      }
      return undefined
    }

    enqueueSendingStage(sendingStage)
    processSendingStageQueue()

    return undefined
  }, [isSending, sendingStage])

  useEffect(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((m) => m?.role === 'assistant' && typeof m?.content === 'string')

    if (!latestAssistantMessage) return undefined

    const targetId = String(latestAssistantMessage.id ?? '')
    const fullText = String(latestAssistantMessage.content ?? '')
    if (!targetId || !fullText) return undefined

    if (assistantMessageContentRef.current.get(targetId) === fullText) return undefined
    assistantMessageContentRef.current.set(targetId, fullText)

    const currentTyped = String(typedAssistantMessages[targetId] ?? '')
    if (currentTyped.length >= fullText.length) return undefined

    if (assistantTypingTimerRef.current) {
      clearInterval(assistantTypingTimerRef.current)
      assistantTypingTimerRef.current = null
    }

    setTypedAssistantMessages((prev) => ({
      ...prev,
      [targetId]: ''
    }))
    setIsAssistantTyping(true)

    let index = 0
    assistantTypingTimerRef.current = setInterval(() => {
      index += 1
      const next = fullText.slice(0, index)
      setTypedAssistantMessages((prev) => ({
        ...prev,
        [targetId]: next
      }))

      if (index >= fullText.length) {
        if (assistantTypingTimerRef.current) {
          clearInterval(assistantTypingTimerRef.current)
          assistantTypingTimerRef.current = null
        }
        setIsAssistantTyping(false)
      }
    }, ASSISTANT_TYPEWRITER_INTERVAL_MS)

    return () => {
      if (assistantTypingTimerRef.current) {
        clearInterval(assistantTypingTimerRef.current)
        assistantTypingTimerRef.current = null
      }
      setIsAssistantTyping(false)
    }
  }, [messages])

  useEffect(() => {
    return () => {
      if (assistantTypingTimerRef.current) {
        clearInterval(assistantTypingTimerRef.current)
        assistantTypingTimerRef.current = null
      }
      setIsAssistantTyping(false)
    }
  }, [])

  useEffect(() => {
    const appPrefix = String(routeContext.appPrefix ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
    if (appPrefix === 'tms') {
      void loadTmsAppRules()
    }
  }, [routeContext.appPrefix, routeContext.pathname])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      const cacheKey = String(routeContext.pathname ?? '').trim()
      const cached = routeMetadataCacheRef.current.get(cacheKey)
      if (cached) {
        setScreenSuggestions(cached.examples)
        setChatInputPlaceholder(cached.inputHint || '')
        return
      }

      try {
        const [settingsResponse, guidanceResponse] = await Promise.all([
          getChatSettings(),
          getGuidanceList(),
        ])
        if (cancelled) return

        const settingsGuidance = Array.isArray(settingsResponse?.data?.management?.guidance)
          ? settingsResponse.data.management.guidance
          : []
        const guidanceItems = Array.isArray(guidanceResponse?.data?.items)
          ? guidanceResponse.data.items
          : settingsGuidance

        console.info('[AI_CHAT][COMMON_HINT_SOURCE]', {
          pathname: routeContext.pathname,
          settingsGuidanceCount: settingsGuidance.length,
          guidanceCount: guidanceItems.length,
          guidanceSample: guidanceItems.slice(0, 5),
        })

        const examples = findGuidanceExamplesForPath(guidanceItems, routeContext.pathname)
        const inputHint = findInputHintForPath(guidanceItems, routeContext.pathname)
        const commonHint = guidanceItems.find(
          (item) => String(item?.appKey ?? '').trim().toLowerCase() === 'common' && String(item?.screenKey ?? item?.key ?? '').trim().toLowerCase() === 'common',
        )

        console.info('[AI_CHAT][COMMON_HINT_RESULT]', {
          pathname: routeContext.pathname,
          examplesCount: examples.length,
          inputHint,
          selectedCommonHint: commonHint,
        })

        routeMetadataCacheRef.current.set(cacheKey, { examples, inputHint })
        setScreenSuggestions(examples)
        setChatInputPlaceholder(inputHint || '')
      } catch {
        if (!cancelled) {
          setScreenSuggestions([])
          setChatInputPlaceholder('')
        }
      }
    }

    loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [routeContext.pathname])

  // 설정 페이지로 이동. 다른 앱이면 전체 로드, 같은 앱이면 SPA 네비게이션.
  const handleOpenSettings = useCallback(() => {
    const target = '/robot/ailog/ai-chat-settings'
    const isCrossApp = getAppPrefix(target) !== getAppPrefix(location.pathname)
    if (isCrossApp) window.location.href = '/' + target.replace(/^\//, '')
    else navigate(target)
  }, [navigate, location.pathname])

  const handleBackToInitial = () => {
    if (isSending) return
    resetMessages()
    setPendingNavigation(null)
    setDraft('')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  useEffect(() => {
    const onTaskflowClarify = (event) => {
      const custom = event
      const message = String(custom?.detail?.message ?? '').trim()
      const replaceMessageId = String(custom?.detail?.assistantMessageId ?? '').trim()
      if (!message) return

      if (replaceMessageId) {
        updateMessageById(replaceMessageId, {
          content: message,
          createdAt: new Date().toISOString(),
          context: routeContext
        })
        return
      }

      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: message,
        createdAt: new Date().toISOString(),
        context: routeContext
      })
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, onTaskflowClarify)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_CLARIFY_EVENT, onTaskflowClarify)
    }
  }, [appendMessage, updateMessageById, routeContext])

  useEffect(() => {
    const onTaskflowCommandResult = (event) => {
      const detail = event?.detail
      const message = String(detail?.message ?? '').trim()
      if (!message) return

      if (detail?.kind === 'draft') {
        const assistantMessageId = String(detail?.assistantMessageId ?? '').trim()
        if (!assistantMessageId) return
        updateMessageById(assistantMessageId, {
          content: message,
          createdAt: new Date().toISOString(),
          context: routeContext
        })
        return
      }

      if (detail?.kind !== 'command') return

      // AI chat commands already append the rule-generated assistant reply before dispatching.
      // Do not overwrite that message with a later success payload; keep the original answer text
      // and use the result event only for chat history persistence.
      const historyContext = detail?.historyContext
      if (historyContext && typeof historyContext === 'object') {
        void saveLocalChatHistory({
          ...historyContext,
          assistantText: message,
          chatAction: 'taskflow-command',
          debugMeta: {
            source: 'local-command',
            commandType: String(detail?.commandType ?? '').trim() || undefined,
            success: Boolean(detail?.success),
            didApply: Boolean(detail?.didApply)
          }
        }).catch((error) => {
          console.warn('[AI_CHAT][LOCAL_COMMAND_HISTORY_SAVE_FAILED]', error)
        })
      }
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_RESULT_EVENT, onTaskflowCommandResult)
    return () => {
      window.removeEventListener(AI_TASKFLOW_CANVAS_RESULT_EVENT, onTaskflowCommandResult)
    }
  }, [appendMessage, updateMessageById, routeContext])

  // chat_action 분기 처리.
  const handleChatAction = useCallback(
    (chatAction, param, assistantMessage, assistantMessageId) => {
      const normalizedActionParam = param && typeof param === 'object' ? (param.chat_action_param ?? param.chatActionParam ?? param) : param
      const taskflowDraft = extractTaskflowDraftParam(normalizedActionParam)
      const taskflowCommand = extractTaskflowCanvasCommandParam(normalizedActionParam)
      console.log('[AI_TASKFLOW][CHAT_ACTION]', {
        chatAction,
        hasParam: Boolean(param),
        hasTaskflowDraft: Boolean(taskflowDraft),
        hasTaskflowCommand: Boolean(taskflowCommand),
        isTmsCanvas: isTmsCanvasPath(location.pathname),
        paramKeys: param && typeof param === 'object' ? Object.keys(param) : [],
        rawParamPreview: param && typeof param === 'object' ? JSON.stringify(param) : param,
        taskflowDraftPreview:
          taskflowDraft && typeof taskflowDraft === 'object' ? JSON.stringify(taskflowDraft) : taskflowDraft
      })
      const finalMessage = String(assistantMessage ?? '').trim()
      const finalMessageId = String(assistantMessageId ?? '').trim()

      const emitFinalMessage = (message, messageId) => {
        if (!message) return
        if (messageId) {
          updateMessageById(messageId, {
            content: message,
            createdAt: new Date().toISOString(),
            context: routeContext
          })
          return
        }
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: message,
          createdAt: new Date().toISOString(),
          context: routeContext
        })
      }

      if (taskflowCommand && isTmsCanvasPath(location.pathname)) {
        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
            detail: {
              command: taskflowCommand,
              chatAction,
              rawParam: param,
              message: finalMessage,
              assistantMessageId: finalMessageId
            }
          })
        )
      }
      if (taskflowDraft && isTmsCanvasPath(location.pathname)) {
        let handled = false
        let appliedSuccessfully = false
        try {
          const applyDraft = window.__AI_TASKFLOW_CANVAS_APPLY__
          if (typeof applyDraft === 'function') {
            console.log('[AI_TASKFLOW][DIRECT_APPLY]', {
              chatAction,
              pathname: location.pathname,
              draftKeys: Object.keys(taskflowDraft || {}),
              draftPayload: JSON.stringify({
                ...taskflowDraft,
                message: finalMessage
              })
            })
            applyDraft({
              ...taskflowDraft,
              message: finalMessage
            })
            handled = true
            appliedSuccessfully = true
          }
        } catch (error) {
          console.warn('[AI_TASKFLOW][SETTER_DISPATCH_FAIL]', error)
        }

        if (!handled) {
          try {
            window.dispatchEvent(
              new CustomEvent(AI_TASKFLOW_CANVAS_DRAFT_EVENT, {
                detail: {
                  draft: taskflowDraft,
                  chatAction,
                  rawParam: param,
                  message: finalMessage,
                  assistantMessageId: finalMessageId
                }
              })
            )
            appliedSuccessfully = true
          } catch (error) {
            console.warn('[AI_TASKFLOW][DRAFT_DISPATCH_FAIL]', error)
          }
        }

        console.log('[AI_TASKFLOW][DISPATCH_DRAFT]', {
          chatAction,
          pathname: location.pathname,
          draftKeys: Object.keys(taskflowDraft || {}),
          handledBySetter: handled,
          appliedSuccessfully,
          draftPayload: JSON.stringify({
            ...taskflowDraft,
            message: finalMessage
          })
        })

        if (!appliedSuccessfully) {
          const failureReason = '캔버스 적용 중 오류가 발생했습니다.'
          const failureMessage = finalMessage
            ? `${finalMessage}\n\n실패 이유: ${failureReason}`
            : `실패 이유: ${failureReason}`
          emitFinalMessage(failureMessage, finalMessageId)
        }
        return
      }

      emitFinalMessage(finalMessage, finalMessageId)

      console.log('[AI_CHAT][NAVIGATION_SWITCH_ENTER]', {
        chatAction,
        pathname: location.pathname,
        param,
        hasPath: Boolean(param?.path),
        phase: 'before-navigation-switch'
      })

      switch (chatAction) {
        // 화면 이동
        case 'navigation': {
          const path = normalizeNavigationPath(param?.path)
          if (!path || path === '/') break
          const pathParams = extractPathParams(path)

          if (pathParams.length > 0) {
            const primaryParamLabel = resolveParamLabel(pathParams[0])
            const fallbackActions = buildNavigationFallbackActions(path)
            const pathTemplate = normalizeNavigationPath(path)

            setPendingNavigation({
              pathTemplate,
              app: String(param?.app ?? '').trim() || undefined,
              paramNames: pathParams,
              screenName: String(param?.screenName ?? '').trim() || undefined,
              fallbackActions
            })

            appendMessage({
              id: buildMessageId(),
              role: 'assistant',
              content: `${primaryParamLabel}를 알려주세요.`,
              suggestedActions: fallbackActions,
              createdAt: new Date().toISOString(),
              context: routeContext
            })
            break
          }

          setPendingNavigation(null)
          const normalizedPath = normalizeNavigationPath(path)
          console.log('[AI_CHAT][NAVIGATE_ATTEMPT]', {
            rawPath: path,
            normalizedPath,
            currentPath: location.pathname,
            currentApp: getAppPrefix(location.pathname),
            targetApp: getAppPrefix(normalizedPath),
            isCrossApp: getAppPrefix(normalizedPath) !== getAppPrefix(location.pathname)
          })
          const isCrossApp = getAppPrefix(normalizedPath) !== getAppPrefix(location.pathname)
          if (isCrossApp) window.location.href = normalizedPath
          else navigate(normalizedPath)
          break
        }

        // 데이터 조회: 이벤트 표에 필터 적용
        case 'ailog/event/filter': {
          const filters = param?.filters
          if (!filters) break
          const target = '/robot/ailog/event'
          if (location.pathname !== target) navigate(target)
          // 이벤트 탭(useAiLogData)이 소비.
          useAiLogEventStore.getState().requestFilters(filters)
          // 멀티턴: 다음 발화에서 이어받을 수 있게 마지막 필터 보관.
          lastFiltersRef.current = filters
          break
        }

        // 정보 문의 / 액션 실행 결과: 답변 텍스트는 이미 표시됨 (추가 UI 동작 없음)
        case 'ailog/event':
        case 'ailog/event/action':
        default:
          break
      }
    },
    [navigate, location.pathname, appendMessage, routeContext]
  )

  const handleSubmit = async (text) => {
    const content = (text ?? draft).trim()
    if (!content || isSending || submitInFlightRef.current) return

    if (isCommandHelpRequest(content)) {
      const appKey = String(routeContext.appPrefix || '').trim() || 'common'
      const screenKey = String(routeContext.pathname || '').trim() || appKey
      const cacheKey = appKey
      const cachedRuleEntries = routeRuleDataCacheRef.current.get(cacheKey)

      try {
        const appRuleResponse = cachedRuleEntries ?? await listChatRules({ appKey }).catch(() => ({ data: { items: [] } }))
        const screenRuleResponse = await listChatRules({ appKey, screenKey }).catch(() => ({ data: { items: [] } }))

        const appRows = Array.isArray(appRuleResponse?.data?.items)
          ? appRuleResponse.data.items
          : Array.isArray(appRuleResponse?.items)
            ? appRuleResponse.items
            : []

        const screenRows = Array.isArray(screenRuleResponse?.data?.items)
          ? screenRuleResponse.data.items
          : Array.isArray(screenRuleResponse?.items)
            ? screenRuleResponse.items
            : []

        const currentPath = normalizeRouteKey(screenKey)
        const rowMatchesCurrentRoute = (row) => {
          const ruleScreenKey = normalizeRouteKey(row?.screenKey ?? row?.screen_key ?? row?.routeKey ?? '')
          if (!ruleScreenKey) return false
          if (ruleScreenKey === 'common' || ruleScreenKey === appKey || ruleScreenKey === currentPath) return true
          return routeTemplateMatches(ruleScreenKey, currentPath)
        }

        const screenMatchedRows = screenRows.filter((row) => rowMatchesCurrentRoute(row))
        const appOnlyRows = appRows.length > 0 ? appRows : screenMatchedRows
        const dedupedRows = []
        const seen = new Set()

        for (const row of appOnlyRows) {
          const key = `${row?.appKey ?? row?.app_key ?? ''}::${row?.screenKey ?? row?.screen_key ?? ''}::${row?.ruleKey ?? row?.rule_key ?? ''}::${row?.ruleType ?? row?.rule_type ?? ''}`
          if (!key || seen.has(key)) continue
          seen.add(key)
          dedupedRows.push(row)
        }

        console.info('[AI_CHAT][RULE_HELP_RAW_ROWS]', {
          appKey,
          screenKey,
          rawRows: dedupedRows.map((row) => ({
            appKey: row?.appKey ?? row?.app_key ?? '',
            screenKey: row?.screenKey ?? row?.screen_key ?? '',
            ruleKey: row?.ruleKey ?? row?.rule_key ?? '',
            valueJson: row?.valueJson ?? row?.value_json ?? row?.value ?? null,
            aliases: (row?.valueJson ?? row?.value_json ?? row?.value ?? {})?.aliases ?? null,
            description: (row?.valueJson ?? row?.value_json ?? row?.value ?? {})?.description ?? null,
          })),
        })

        const helpEntries = extractCommandHelpEntries(dedupedRows).map((entry) => ({
          ...entry,
          screenAvailable: true,
        }))

        console.info('[AI_CHAT][RULE_HELP_DEBUG]', {
          appKey,
          screenKey,
          appRowCount: appRows.length,
          screenRowCount: screenRows.length,
          screenMatchedCount: screenMatchedRows.length,
          mergedRowCount: dedupedRows.length,
          appKeyOnlyMode: true,
          helpEntries: helpEntries.map((entry) => ({
            command: entry.command,
            aliases: entry.aliases,
            screenAvailable: entry.screenAvailable,
            description: entry.description,
          })),
        })

        routeRuleDataCacheRef.current.set(cacheKey, appRows)

        const userMessage = {
          id: buildMessageId(),
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
          context: { ...routeContext, sentAt: new Date().toISOString() }
        }
        const helpText = buildCommandHelpReplyText(helpEntries)
        const assistantMessage = {
          id: buildMessageId(),
          role: 'assistant',
          content: helpText,
          createdAt: new Date().toISOString(),
          context: { ...routeContext, sentAt: new Date().toISOString() }
        }

        appendMessage(userMessage)
        appendMessage(assistantMessage)
        setDraft('')
        return
      } catch (error) {
        console.warn('[AI_CHAT][RULE_HELP_FAILED]', error)
        appendMessage({
          id: buildMessageId(),
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
          context: { ...routeContext, sentAt: new Date().toISOString() }
        })
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: '현재 화면의 룰 데이터를 불러오지 못했습니다. ai-chat-settings에서 rule을 등록해 주세요.',
          createdAt: new Date().toISOString(),
          context: { ...routeContext, sentAt: new Date().toISOString() }
        })
        setDraft('')
        return
      }
    }

    submitInFlightRef.current = true

    const cacheKey = `${String(routeContext.pathname ?? '').trim()}::${content}`
    const cachedAnswer = routeAnswerCacheRef.current.get(cacheKey)
    if (cachedAnswer) {
      appendMessage({
        id: buildMessageId(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        context: { ...routeContext, sentAt: new Date().toISOString() }
      })
      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: cachedAnswer.text,
        createdAt: new Date().toISOString(),
        context: { ...routeContext, sentAt: new Date().toISOString() }
      })
      setDraft('')
      submitInFlightRef.current = false
      return
    }

    const latestAssistantMessage = [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find((item) => item?.role === 'assistant' && String(item?.content ?? '').trim())?.content
    const scopedLastAssistantMessage = isTmsCanvasPath(routeContext.pathname)
      ? String(latestAssistantMessage ?? '').trim() || undefined
      : undefined

    const createdAt = new Date().toISOString()
    const now = new Date()
    const conversationId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const context = { ...routeContext, sentAt: createdAt }

    appendMessage({ id: buildMessageId(), role: 'user', content, createdAt, context })

    let localCommandRule = null
    const localCommandGate = Boolean(commandAdapter?.isActive?.(routeContext.pathname))
    console.log('[AI_CHAT][LOCAL_COMMAND_GATE]', {
      pathname: routeContext.pathname,
      isActive: localCommandGate,
      hasAdapter: Boolean(commandAdapter),
      message: content,
      appPrefix: routeContext.appPrefix,
      phase: 'before-local-match'
    })
    if (localCommandGate) {
      try {
        localCommandRule = await commandAdapter.match(content, routeContext.pathname)
        console.log('[AI_CHAT][LOCAL_COMMAND_MATCH_RESULT]', {
          pathname: routeContext.pathname,
          message: content,
          matched: Boolean(localCommandRule),
          ruleKey: localCommandRule?.ruleKey ?? null,
          commandType: localCommandRule?.command?.type ?? null,
          replyText: localCommandRule?.replyText ?? null,
          phase: 'after-local-match'
        })
      } catch (error) {
        console.warn('[AI_CHAT][LOCAL_COMMAND_MATCH_FAILED]', error)
      }
    }
    if (localCommandRule) {
      const localReplyText = String(localCommandRule.replyText ?? '').trim()
      const localAssistantMessageId = localReplyText ? buildMessageId() : ''
      const localChatAction = String(localCommandRule.chatAction ?? '').trim()
      console.log('[AI_CHAT][LOCAL_COMMAND_EARLY_RETURN]', {
        pathname: routeContext.pathname,
        message: content,
        ruleKey: localCommandRule?.ruleKey ?? null,
        commandType: localCommandRule?.command?.type ?? null,
        chatAction: localChatAction || null,
        hasCommand: Boolean(localCommandRule?.command),
        willReturn: true,
        phase: 'before-early-return'
      })

      const localActionParam = localCommandRule.chatActionParam ?? localCommandRule.chat_action_param ?? null
      if (localChatAction || (localActionParam && typeof localActionParam === 'object' && hasCanvasDraftPayload(localActionParam))) {
        handleChatAction(localChatAction || 'action', localActionParam, localReplyText, localAssistantMessageId)
        setDraft('')
        submitInFlightRef.current = false
        return
      }

      if (localReplyText) {
        appendMessage({
          id: localAssistantMessageId,
          role: 'assistant',
          content: localReplyText,
          createdAt: new Date().toISOString(),
          context
        })
      }

      if (!localCommandRule.command) {
        setDraft('')
        submitInFlightRef.current = false
        return
      }

      window.dispatchEvent(
        new CustomEvent(AI_TASKFLOW_CANVAS_COMMAND_EVENT, {
          detail: {
            command: localCommandRule.command,
            replyText: localCommandRule.replyText,
            assistantMessageId: localAssistantMessageId,
            historyContext: {
              author: session?.email || undefined,
              conversationId,
              currentApp: routeContext.appPrefix || undefined,
              currentPath: routeContext.pathname,
              userMessage: content
            }
          }
        })
      )
      setDraft('')
      submitInFlightRef.current = false
      return
    }

    if (pendingNavigation) {
      const parsedParams = parseNavigationParamInput(content, pendingNavigation.paramNames)

      if (!parsedParams) {
        const primaryParamLabel = resolveParamLabel(pendingNavigation.paramNames?.[0])
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: `${primaryParamLabel}를 다시 알려주세요.`,
          suggestedActions: pendingNavigation.fallbackActions ?? [],
          createdAt: new Date().toISOString(),
          context
        })
        submitInFlightRef.current = false
        return
      }

      const resolvedPath = normalizeNavigationPath(fillPathTemplate(pendingNavigation.pathTemplate, parsedParams))
      if (!resolvedPath || resolvedPath === '/' || extractPathParams(resolvedPath).length > 0) {
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: '상세 화면 이동이 어려워서 대체 화면을 제안드릴게요.',
          suggestedActions: pendingNavigation.fallbackActions ?? [],
          createdAt: new Date().toISOString(),
          context
        })
        submitInFlightRef.current = false
        return
      }

      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: '네 상세화면으로 이동하겠습니다.',
        suggestedActions: pendingNavigation.fallbackActions ?? [],
        createdAt: new Date().toISOString(),
        context
      })

      setPendingNavigation(null)
      setDraft('')

      console.log('[AI_CHAT][NAVIGATE_ATTEMPT][PARAM]', {
        pathTemplate: pendingNavigation.pathTemplate,
        parsedParams,
        resolvedPath,
        currentPath: location.pathname,
        currentApp: getAppPrefix(location.pathname),
        targetApp: getAppPrefix(resolvedPath),
        isCrossApp: getAppPrefix(resolvedPath) !== getAppPrefix(location.pathname)
      })
      const isCrossApp = getAppPrefix(resolvedPath) !== getAppPrefix(location.pathname)
      if (isCrossApp) window.location.href = resolvedPath
      else navigate(resolvedPath)
      submitInFlightRef.current = false
      return
    }

    setDraft('')
    sendingStartedAtRef.current = Date.now()
    setSendingElapsedSec(0)
    setIsSending(true)
    setSendingStage(SENDING_STAGE.NODE_WORKING)
    sendingStagePlanRef.current = [SENDING_STAGE.NODE_WORKING]
    stageQueueRef.current = []
    displayedStageRef.current = SENDING_STAGE.NODE_WORKING
    if (stageAdvanceTimerRef.current) {
      clearTimeout(stageAdvanceTimerRef.current)
      stageAdvanceTimerRef.current = null
    }

    setDraft('')
    sendingStartedAtRef.current = Date.now()
    setSendingElapsedSec(0)
    setIsSending(true)
    setSendingStage(SENDING_STAGE.REQUESTING)
    sendingStagePlanRef.current = buildSendingStagePlan(content)
    stageQueueRef.current = buildSendingStagePlan(content).slice(1)
    displayedStageRef.current = SENDING_STAGE.IDLE
    if (stageAdvanceTimerRef.current) {
      clearTimeout(stageAdvanceTimerRef.current)
      stageAdvanceTimerRef.current = null
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const flowContext = buildTaskflowFlowContext(routeContext.pathname)
      const taskflowContext = buildTaskflowRequestContext(flowContext)
      console.log('[AI_TASKFLOW][1단계:컨텍스트_구성]', {
        pathname: routeContext.pathname,
        taskFlowId: flowContext?.taskFlowId,
        nodeCount: Number(flowContext?.nodeCount ?? 0),
        edgeCount: Number(flowContext?.edgeCount ?? 0),
        taskListCount: Array.isArray(flowContext?.taskList) ? flowContext.taskList.length : 0,
        taskContentsCount: Array.isArray(flowContext?.taskContents) ? flowContext.taskContents.length : 0,
        currentNodeListCount: Array.isArray(flowContext?.nodes) ? flowContext.nodes.length : 0,
        flowDefinitionNodeCount: Array.isArray(flowContext?.flowDefinition?.nodes)
          ? flowContext.flowDefinition.nodes.length
          : 0,
        flowDefinitionEdgeCount: Array.isArray(flowContext?.flowDefinition?.edges)
          ? flowContext.flowDefinition.edges.length
          : 0,
        taskList: Array.isArray(flowContext?.taskList) ? flowContext.taskList : [],
        taskContents: Array.isArray(flowContext?.taskContents) ? flowContext.taskContents : [],
        currentNodeList: Array.isArray(flowContext?.nodes) ? flowContext.nodes : []
      })

      console.log('[AI_TASKFLOW][2단계:요청페이로드_검증]', {
        hasTaskflowContext: Boolean(taskflowContext),
        hasFlowDefinition: false,
        hasFullFlow: Boolean(taskflowContext?.fullFlow),
        taskflowNodeCount: Array.isArray(taskflowContext?.fullFlow?.nodes) ? taskflowContext.fullFlow.nodes.length : 0,
        taskflowEdgeCount: Array.isArray(taskflowContext?.fullFlow?.edges) ? taskflowContext.fullFlow.edges.length : 0,
        taskflowFlowDefinition: undefined
      })

      console.log('[AI_CHAT][RULE_MATCH][요청]', {
        message: content,
        currentPath: pageContextOn ? routeContext.pathname : undefined,
        currentApp: pageContextOn ? routeContext.appPrefix || undefined : undefined
      })

      const result = await postSiteAssistantChat({
        message: content,
        currentPath: pageContextOn ? routeContext.pathname : undefined,
        currentApp: pageContextOn ? routeContext.appPrefix || undefined : undefined,
        conversationId,
        // 작성자(대화기록 저장용)
        author: session?.email || undefined,
        // data/action 인텐트에서 robot/AI API 호출에 필요한 자격증명·엔드포인트
        accessToken: session?.accessToken,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        eventAnalyzerUrl: import.meta.env.VITE_EVENT_ANALYZER_URL,
        configManagerUrl: import.meta.env.VITE_CONFIG_MANAGER_URL,
        previousFilters: lastFiltersRef.current || undefined,
        lastAssistantMessage: scopedLastAssistantMessage,
        context: {
          groupId: selectedOrgs?.[0],
          siteId: selectedOrgs?.[1],
          // 이벤트 화면의 현재 필터(기간 포함). 백엔드가 기간 미지정 질의 처리 시 참고할 수 있다.
          eventFilters:
            currentEventFilters &&
            typeof currentEventFilters === 'object' &&
            currentEventFilters.startDate &&
            currentEventFilters.endDate
              ? currentEventFilters
              : undefined,
          taskflow: taskflowContext
        },
        signal: controller.signal
      })

      console.log(`result`, result)
      const data = result?.data ?? {}
      const chat_action = data.chat_action
      const chat_action_param = data.chat_action_param
      const pipelineTrace = extractPipelineTrace(result)
      const pipelineConfidence = extractPipelineConfidence(result)
      const ragMatchInfo = extractRagMatchInfo(result)
      const matchedRuleInfo = extractMatchedRuleInfo(result)
      if (pipelineConfidence !== undefined) {
        console.log(`[AI_CHAT][PIPELINE_CONFIDENCE] ${pipelineConfidence.toFixed(2)}`)
      }
      if (pipelineTrace) {
        console.log(`[AI_CHAT][PIPELINE_TRACE] ${pipelineTrace}`)
      }
      console.log('[AI_CHAT][RAG_MATCH]', {
        usedCollection: ragMatchInfo.usedCollection || '-',
        usedChunkKeys: ragMatchInfo.usedChunkKeys
      })
      console.log('[AI_CHAT][RAG_SCORES]', ragMatchInfo.ragScores)
      if (matchedRuleInfo.ruleKey || matchedRuleInfo.reason) {
        console.log('[AI_CHAT][MATCHED_RULE]', matchedRuleInfo)
      }

      const ruleCanvasDraft = extractTaskflowDraftParam(chat_action_param)

      console.log('[AI_CHAT][RULE_MATCH][응답]', {
        matched: Boolean(matchedRuleInfo.ruleKey || matchedRuleInfo.reason),
        source: matchedRuleInfo.source || '-',
        ruleKey: matchedRuleInfo.ruleKey || '-',
        ruleType: matchedRuleInfo.ruleType || '-',
        confidence: matchedRuleInfo.confidence,
        reason: matchedRuleInfo.reason || '-',
        chatAction: chat_action || '-',
        hasCanvasDraft: Boolean(ruleCanvasDraft),
        canvasDraft: ruleCanvasDraft,
        pipelineTrace: pipelineTrace || '-'
      })

      if (!matchedRuleInfo.ruleKey && !matchedRuleInfo.reason) {
        console.warn('[AI_CHAT][RULE_MATCH][미매칭] 룰 매칭 없이 LLM 파이프라인으로 처리됨', {
          message: content,
          currentPath: pageContextOn ? routeContext.pathname : undefined,
          pipelineTrace: pipelineTrace || '-'
        })
      }
      const navigationPath = String(chat_action_param?.path ?? '')
        .trim()
        .replace(/^\/+/, '')
      const hasNavigationParams = chat_action === 'navigation' && extractPathParams(navigationPath).length > 0
      const suggestedActions = chat_action === 'ailog/event/filter' ? [] : extractSuggestedActions(result)
      const images = extractAssistantImages(result)

      setSendingStage(SENDING_STAGE.COMPLETED)
      await sleep(280)

      if (!hasNavigationParams) {
        const assistantMessageId = buildMessageId()
        appendMessage({
          id: assistantMessageId,
          role: 'assistant',
          content: extractAssistantText(result),
          pipelineTrace,
          pipelineConfidence,
          matchedRule: matchedRuleInfo,
          images,
          suggestedActions,
          createdAt: new Date().toISOString(),
          context
        })

        handleChatAction(chat_action, chat_action_param, extractAssistantText(result), assistantMessageId)
      } else {
        handleChatAction(chat_action, chat_action_param, extractAssistantText(result))
      }
    } catch (error) {
      // 사용자가 "중지" 를 눌러 취소한 경우: 에러 메시지 대신 안내만.
      if (error?.name === 'AbortError') {
        setSendingStage(SENDING_STAGE.COMPLETED)
        await sleep(180)
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: '답변 생성을 중지했습니다.',
          createdAt: new Date().toISOString(),
          context
        })
      } else {
        setSendingStage(SENDING_STAGE.COMPLETED)
        await sleep(180)
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: error?.message || '답변을 가져오지 못했습니다.',
          createdAt: new Date().toISOString(),
          context
        })
      }
    } finally {
      abortRef.current = null
      setIsSending(false)
      setSendingStage(SENDING_STAGE.IDLE)
      sendingStagePlanRef.current = buildSendingStagePlan('')
      stageQueueRef.current = []
      displayedStageRef.current = SENDING_STAGE.IDLE
      sendingStartedAtRef.current = null
      submitInFlightRef.current = false
      textareaRef.current?.focus()
    }
  }

  // 답변 생성 중지
  const handleStop = useCallback(() => {
    if (isSending) {
      abortRef.current?.abort()
      return
    }

    if (assistantTypingTimerRef.current) {
      clearInterval(assistantTypingTimerRef.current)
      assistantTypingTimerRef.current = null
    }

    setTypedAssistantMessages((prev) => {
      const next = { ...prev }
      for (const message of messages) {
        if (message?.role !== 'assistant') continue
        const id = String(message?.id ?? '')
        const full = String(message?.content ?? '')
        if (!id || !full) continue
        if (String(next[id] ?? '').length >= full.length) continue
        next[id] = full
      }
      return next
    })
    setIsAssistantTyping(false)
  }, [isSending, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!draft.trim() || isSending) return
      handleSubmit()
    }
  }

  return (
    <StyledAiAssistantDock className={className} $isOpen={isOpen}>
      {/* ── Header ── */}
      <StyledAiAssistantDockHeader>
        <StyledAiHeaderLeft>
          {isOpen && hasConversation && (
            <StyledAiAssistantDockToggle
              onClick={handleBackToInitial}
              title="처음 화면으로"
              disabled={isSending}
              type="button"
            >
              <Icon name="arrow_left" size={16} />
            </StyledAiAssistantDockToggle>
          )}

          <StyledAiBotAvatar>✦</StyledAiBotAvatar>

          {isOpen && <StyledAiAssistantPanelTitle>AI Assistant</StyledAiAssistantPanelTitle>}
        </StyledAiHeaderLeft>

        <StyledAiHeaderActions>
          {isOpen && (
            <StyledAiAssistantDockToggle onClick={handleOpenSettings} title="채팅 설정" type="button">
              <Icon name="settings" size={16} />
            </StyledAiAssistantDockToggle>
          )}

          <StyledAiAssistantDockToggle
            onClick={() => (isOpen ? closePanel?.() : openPanel?.())}
            title={isOpen ? '닫기' : '열기'}
            type="button"
          >
            <Icon name={isOpen ? 'arrow_right' : 'arrow_left'} size={16} />
          </StyledAiAssistantDockToggle>
        </StyledAiHeaderActions>
      </StyledAiAssistantDockHeader>

      {/* ── Floating trigger (collapsed) ── */}
      {!isOpen && <FloatingTrigger onClick={openPanel} />}

      {/* ── Open body ── */}
      {isOpen && (
        <StyledAiAssistantDockBody>
          {!hasConversation ? (
            <>
              <StyledAiGreeting>
                <StyledAiGreetingLine>
                  {userName ? (
                    <>
                      안녕하세요 <strong>{userName}</strong>님,
                    </>
                  ) : (
                    '안녕하세요!'
                  )}
                </StyledAiGreetingLine>

                {greetingExtra && <div style={{ margin: '8px 0' }}>{greetingExtra}</div>}

                <StyledAiGreetingCta>무엇을 도와드릴까요?</StyledAiGreetingCta>
              </StyledAiGreeting>

              {ENABLE_QUICK_COMMANDS && quickCommands.length > 0 ? (
                <div style={{ padding: '0 1.6rem 1.2rem' }}>
                  <StyledAiAssistantMessage $role="assistant">
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
                      아래 명령어를 추천드려요.
                    </div>
                    <StyledAiActionCards>
                      {quickCommands.map((command) => (
                        <StyledAiActionCard key={command} type="button" onClick={() => handleSubmit(command)}>
                          <StyledAiActionCardTitle>{command}</StyledAiActionCardTitle>
                        </StyledAiActionCard>
                      ))}
                    </StyledAiActionCards>
                  </StyledAiAssistantMessage>
                </div>
              ) : null}
            </>
          ) : (
            <StyledAiAssistantMessageList ref={messageListRef}>
              {messages.map((m) => (
                <StyledAiAssistantMessage key={m.id} $role={m.role}>
                  <StyledAiAssistantMessageMeta>
                    {m.role === 'user' ? '나' : 'AI Assistant'}
                  </StyledAiAssistantMessageMeta>

                  <StyledAiAssistantMessageBubble $role={m.role}>
                    {m.role === 'assistant' ? (typedAssistantMessages[m.id] ?? m.content) : m.content}
                  </StyledAiAssistantMessageBubble>

                  {m.role === 'assistant' && (m?.matchedRule?.ruleKey || m?.matchedRule?.reason || m?.pipelineTrace) ? (
                    <StyledAiAssistantPipelineTrace>
                      {m?.matchedRule?.ruleKey || m?.matchedRule?.reason
                        ? `매칭 룰: ${String(m?.matchedRule?.ruleKey || '-')} ${String(m?.matchedRule?.ruleType || '').trim() ? `(${String(m.matchedRule.ruleType).trim()})` : ''}${Number.isFinite(Number(m?.matchedRule?.confidence)) ? ` · ${Number(m.matchedRule.confidence).toFixed(2)}` : ''}`
                        : `흐름: ${String(m?.pipelineTrace ?? '').trim() || '-'}`}
                    </StyledAiAssistantPipelineTrace>
                  ) : null}

                  {m.role === 'assistant' && Array.isArray(m.images) && m.images[0] ? (
                    <StyledAiAssistantImageList>
                      <StyledAiAssistantImageCard key={m.images[0].id || m.images[0].src}>
                        <StyledAiAssistantImage
                          src={m.images[0].src}
                          alt={m.images[0].alt || m.images[0].title || 'assistant image'}
                          loading="lazy"
                        />
                        {m.images[0].title || m.images[0].caption ? (
                          <StyledAiAssistantImageCaption>
                            {m.images[0].title ? (
                              <StyledAiAssistantImageTitle>{m.images[0].title}</StyledAiAssistantImageTitle>
                            ) : null}
                            {m.images[0].caption ? (
                              <StyledAiAssistantImageText>{m.images[0].caption}</StyledAiAssistantImageText>
                            ) : null}
                          </StyledAiAssistantImageCaption>
                        ) : null}
                      </StyledAiAssistantImageCard>
                    </StyledAiAssistantImageList>
                  ) : null}

                  {ENABLE_MESSAGE_SUGGESTED_ACTIONS &&
                    m.role === 'assistant' &&
                    Array.isArray(m.suggestedActions) &&
                    m.suggestedActions.length > 0 && (
                      <>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
                          아래 명령어를 추천드려요.
                        </div>
                        <StyledAiActionCards>
                          {m.suggestedActions.map((item) => (
                            <StyledAiActionCard
                              key={item.id}
                              type="button"
                              onClick={() => handleChatAction(item.chatAction, item.chatActionParam)}
                            >
                              <StyledAiActionCardTitle>{item.label}</StyledAiActionCardTitle>
                              {item.keyword ? (
                                <StyledAiActionCardKeyword>{item.keyword}</StyledAiActionCardKeyword>
                              ) : null}
                            </StyledAiActionCard>
                          ))}
                        </StyledAiActionCards>
                      </>
                    )}
                </StyledAiAssistantMessage>
              ))}

              {isSending && (
                <StyledAiAssistantMessage $role="assistant">
                  <StyledAiAssistantLoadingBubble $stage={sendingStage} $elapsed={sendingElapsedSec}>
                    <StyledAiAssistantLoadingRow>
                      <StyledAiAssistantLoadingDots $stage={sendingStage} $elapsed={sendingElapsedSec}>
                        <span />
                        <span />
                        <span />
                      </StyledAiAssistantLoadingDots>
                      <StyledAiAssistantLoadingText $stage={sendingStage} $elapsed={sendingElapsedSec}>
                        {(typedStageLabel || '...') + ` · ${sendingElapsedSec}초`}
                      </StyledAiAssistantLoadingText>
                    </StyledAiAssistantLoadingRow>
                  </StyledAiAssistantLoadingBubble>
                </StyledAiAssistantMessage>
              )}
            </StyledAiAssistantMessageList>
          )}

          {/* ── Composer ── */}
          <StyledAiAssistantComposer
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
          >
            <StyledAiComposerBox>
              <StyledAiAssistantTextarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={chatInputPlaceholder}
                readOnly={isSending}
                rows={3}
              />

              <StyledAiComposerFooter>
                <StyledAiContextChips>
                  {hasConversation && (
                    <StyledAiContextChip type="button" onClick={handleBackToInitial} disabled={isSending}>
                      대화 초기화
                    </StyledAiContextChip>
                  )}
                </StyledAiContextChips>

                {isSending || isAssistantTyping ? (
                  <StyledAiStopButton
                    type="button"
                    onClick={handleStop}
                    title={isSending ? '답변 생성 정지' : '텍스트 표시 정지'}
                  >
                    정지
                  </StyledAiStopButton>
                ) : (
                  <StyledAiSendButton type="submit" disabled={!draft.trim()} title="전송">
                    ↑
                  </StyledAiSendButton>
                )}
              </StyledAiComposerFooter>
            </StyledAiComposerBox>
          </StyledAiAssistantComposer>

          <StyledAiDisclaimer>AI 답변은 오류가 포함될 수 있습니다. 내용을 확인 후 활용해 주세요.</StyledAiDisclaimer>
        </StyledAiAssistantDockBody>
      )}
    </StyledAiAssistantDock>
  )
}

export default AiAssistantPanel
