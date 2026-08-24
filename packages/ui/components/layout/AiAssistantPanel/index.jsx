import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAiAssistantStore, useUserStore, useOrganizationStore, useAiLogEventStore } from '@repo/stores'
import { getAppPrefix } from '@repo/utils'
import {
  getChatHistory,
  getChatSettings,
  getGuidanceList,
  matchChatRule,
  saveLocalChatHistory
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
  StyledAiCommandTip,
  StyledAiCommandTipExample,
  StyledAiCommandTipExamples,
  StyledAiCommandTipTitle,
  StyledAiHelpCommand,
  StyledAiHelpCommandDescription,
  StyledAiHelpCommandExample,
  StyledAiHelpCommandList,
  StyledAiHelpContent,
  StyledAiHelpIntro,
  StyledAiHelpSection,
  StyledAiHelpSectionTitle,
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
import { ruleCheck } from '@repo/ai/rules/tms/chat-rule-matcher.js'

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
const ASSISTANT_TYPEWRITER_MIN_INTERVAL_MS = 10
const ASSISTANT_TYPEWRITER_MAX_INTERVAL_MS = 24

const getAssistantTypingPace = (text = '') => {
  const length = String(text).length

  if (length >= 1400) return { intervalMs: ASSISTANT_TYPEWRITER_MIN_INTERVAL_MS, charsPerTick: 10 }
  if (length >= 900) return { intervalMs: 12, charsPerTick: 8 }
  if (length >= 500) return { intervalMs: 14, charsPerTick: 6 }
  if (length >= 260) return { intervalMs: 18, charsPerTick: 4 }

  return {
    intervalMs: Math.max(ASSISTANT_TYPEWRITER_MIN_INTERVAL_MS, ASSISTANT_TYPEWRITER_MAX_INTERVAL_MS),
    charsPerTick: 1
  }
}

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
        appKey: String(item?.appKey ?? '')
          .trim()
          .toLowerCase(),
        isCommon:
          String(item?.appKey ?? '')
            .trim()
            .toLowerCase() === 'common' || key === 'common'
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
        appKey: String(item?.appKey ?? '')
          .trim()
          .toLowerCase(),
        isCommon:
          String(item?.appKey ?? '')
            .trim()
            .toLowerCase() === 'common' || key === 'common'
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

const buildMessagesFromHistory = (items) =>
  [...(Array.isArray(items) ? items : [])].reverse().flatMap((item) => {
    const logId = String(item?.id ?? '')
    const createdAt = item?.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
    const context = {
      pathname: String(item?.currentPath ?? ''),
      appPrefix: String(item?.currentApp ?? ''),
      conversationId: String(item?.conversationId ?? '')
    }
    const historyMessages = []
    const userMessage = String(item?.userMessage ?? '').trim()
    const assistantText = String(item?.assistantText ?? '').trim()

    if (userMessage) {
      historyMessages.push({ id: `history-${logId}-user`, role: 'user', content: userMessage, createdAt, context })
    }
    if (assistantText) {
      historyMessages.push({
        id: `history-${logId}-assistant`,
        role: 'assistant',
        content: assistantText,
        createdAt,
        context
      })
    }
    return historyMessages
  })

const getChatDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const formatChatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
}

const formatChatTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const parseTmsHelpContent = (value) => {
  const lines = String(value || '').split('\n')
  const introLines = []
  const sections = []
  let currentSection = null

  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentSection = { title: line.slice(4).trim(), commands: [] }
      sections.push(currentSection)
      continue
    }

    if (!currentSection) {
      if (line.trim()) introLines.push(line)
      continue
    }

    const separatorIndex = line.indexOf(' : ')
    if (separatorIndex < 0) continue
    currentSection.commands.push({
      example: line.slice(0, separatorIndex).trim(),
      description: line.slice(separatorIndex + 3).trim()
    })
  }

  if (sections.length <= 0) return null
  return { intro: introLines.join('\n'), sections }
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

  const isOpen = useAiAssistantStore((state) => state.isOpen)
  const openPanel = useAiAssistantStore((state) => state.openPanel)
  const closePanel = useAiAssistantStore((state) => state.closePanel)
  const messages = useAiAssistantStore((state) => state.messages)
  const appendMessage = useAiAssistantStore((state) => state.appendMessage)
  const replaceMessages = useAiAssistantStore((state) => state.replaceMessages)
  const prependMessages = useAiAssistantStore((state) => state.prependMessages)
  const updateMessageById = useAiAssistantStore((state) => state.updateMessageById)
  const resetMessages = useAiAssistantStore((state) => state.resetMessages)

  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendingStage, setSendingStage] = useState(SENDING_STAGE.IDLE)
  const [sendingElapsedSec, setSendingElapsedSec] = useState(0)
  const [typedStageLabel, setTypedStageLabel] = useState('')
  const [typedAssistantMessages, setTypedAssistantMessages] = useState({})
  const [pageContextOn, setPageContextOn] = useState(true)
  const [screenSuggestions, setScreenSuggestions] = useState([])
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState('')
  const [isAssistantTyping, setIsAssistantTyping] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const messageListRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const activeRequestIdRef = useRef(0)
  const historyPageRef = useRef(0)
  const historyHasMoreRef = useRef(false)
  const historyLoadingRef = useRef(false)
  const historyRequestIdRef = useRef(0)
  const pendingScrollRestoreRef = useRef(null)
  const shouldScrollToBottomRef = useRef(true)
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
  const lastFiltersRef = useRef(null)

  const routeContext = useMemo(() => buildRouteContext(location), [location])
  const routeMetadataCacheRef = useRef(new Map())
  const [routeAppKey, setRouteAppKey] = useState('common')
  const [routeScreenKey, setRouteScreenKey] = useState('common')

  useEffect(() => {
    const rawPath = String(routeContext?.pathname ?? '').trim()
    const normalizedPath = rawPath.replace(/^\/+|\/+$/g, '')
    const pathParts = normalizedPath.split('/').filter(Boolean)

    setRouteAppKey(pathParts[0] || 'common')
    setRouteScreenKey(normalizedPath || 'common')
  }, [routeContext.pathname])

  const markHistoryMessagesAsDisplayed = useCallback((historyMessages) => {
    const assistantMessages = historyMessages.filter((message) => message?.role === 'assistant' && message?.id)
    if (assistantMessages.length === 0) return

    setTypedAssistantMessages((current) => {
      const next = { ...current }
      for (const message of assistantMessages) {
        const id = String(message.id)
        const content = String(message.content ?? '')
        next[id] = content
        assistantMessageContentRef.current.set(id, content)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const author = String(session?.email ?? '').trim()
    const historyRequestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = historyRequestId
    let cancelled = false

    activeRequestIdRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    historyPageRef.current = 0
    historyHasMoreRef.current = false
    historyLoadingRef.current = Boolean(author)
    pendingScrollRestoreRef.current = null
    shouldScrollToBottomRef.current = true
    resetMessages()
    setTypedAssistantMessages({})
    setIsHistoryLoading(Boolean(author))

    if (!author) return undefined

    const loadInitialHistory = async () => {
      try {
        const response = await getChatHistory({ page: 1, pageSize: 20, author })
        if (cancelled || historyRequestIdRef.current !== historyRequestId) return

        const historyMessages = buildMessagesFromHistory(response?.data?.items)
        const pagination = response?.data?.pagination ?? {}
        markHistoryMessagesAsDisplayed(historyMessages)
        replaceMessages(historyMessages)
        historyPageRef.current = Number(pagination.page ?? 1)
        historyHasMoreRef.current = Boolean(pagination.hasNext)
      } catch {
        if (!cancelled) {
          replaceMessages([])
        }
      } finally {
        if (!cancelled) {
          historyLoadingRef.current = false
          setIsHistoryLoading(false)
        }
      }
    }

    loadInitialHistory()

    return () => {
      cancelled = true
    }
  }, [session?.email, markHistoryMessagesAsDisplayed, replaceMessages, resetMessages])

  const loadOlderHistory = useCallback(async () => {
    const author = String(session?.email ?? '').trim()
    const messageList = messageListRef.current
    if (!author || !messageList || historyLoadingRef.current || !historyHasMoreRef.current) return

    historyLoadingRef.current = true
    const historyRequestId = historyRequestIdRef.current + 1
    historyRequestIdRef.current = historyRequestId
    setIsHistoryLoading(true)
    pendingScrollRestoreRef.current = {
      scrollHeight: messageList.scrollHeight,
      scrollTop: messageList.scrollTop
    }

    try {
      const response = await getChatHistory({ page: historyPageRef.current + 1, pageSize: 20, author })
      if (historyRequestIdRef.current !== historyRequestId) return
      const historyMessages = buildMessagesFromHistory(response?.data?.items)
      const pagination = response?.data?.pagination ?? {}
      markHistoryMessagesAsDisplayed(historyMessages)
      prependMessages(historyMessages)
      historyPageRef.current = Number(pagination.page ?? historyPageRef.current + 1)
      historyHasMoreRef.current = Boolean(pagination.hasNext)
    } catch {
      pendingScrollRestoreRef.current = null
    } finally {
      historyLoadingRef.current = false
      setIsHistoryLoading(false)
    }
  }, [session?.email, markHistoryMessagesAsDisplayed, prependMessages])

  const handleMessageListScroll = useCallback(
    (event) => {
      if (event.currentTarget.scrollTop <= 48) {
        loadOlderHistory()
      }
    },
    [loadOlderHistory]
  )

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
    const messageList = messageListRef.current
    if (!messageList || !isOpen) return

    const pendingScrollRestore = pendingScrollRestoreRef.current
    if (pendingScrollRestore) {
      pendingScrollRestoreRef.current = null
      requestAnimationFrame(() => {
        messageList.scrollTop =
          messageList.scrollHeight - pendingScrollRestore.scrollHeight + pendingScrollRestore.scrollTop
      })
      return
    }

    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false
      requestAnimationFrame(() => {
        messageList.scrollTop = messageList.scrollHeight
      })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen || !hasConversation) return
    const messageList = messageListRef.current
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight
    }
  }, [isOpen, hasConversation])

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

    const { intervalMs, charsPerTick } = getAssistantTypingPace(fullText)
    let index = 0
    assistantTypingTimerRef.current = setInterval(() => {
      index += charsPerTick
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
    }, intervalMs)

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
        const [settingsResponse, guidanceResponse] = await Promise.all([getChatSettings(), getGuidanceList()])
        if (cancelled) return

        const settingsGuidance = Array.isArray(settingsResponse?.data?.management?.guidance)
          ? settingsResponse.data.management.guidance
          : []
        const guidanceItems = Array.isArray(guidanceResponse?.data?.items)
          ? guidanceResponse.data.items
          : settingsGuidance

        const examples = findGuidanceExamplesForPath(guidanceItems, routeContext.pathname)
        const inputHint = findInputHintForPath(guidanceItems, routeContext.pathname)
        const commonHint = guidanceItems.find(
          (item) =>
            String(item?.appKey ?? '')
              .trim()
              .toLowerCase() === 'common' &&
            String(item?.screenKey ?? item?.key ?? '')
              .trim()
              .toLowerCase() === 'common'
        )

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
    historyRequestIdRef.current += 1
    historyHasMoreRef.current = false
    historyLoadingRef.current = false
    pendingScrollRestoreRef.current = null
    setIsHistoryLoading(false)
    resetMessages()
    setDraft('')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const requestAssistantReply = useCallback(
    async ({ content, currentPath, currentApp, conversationId, author, groupId, siteId, context, signal }) =>
      postSiteAssistantChat({
        message: content,
        currentPath: currentPath || undefined,
        currentApp: currentApp || undefined,
        conversationId,
        author,
        groupId,
        siteId,
        context,
        signal
      }),
    []
  )

  const showAssistantReply = useCallback(
    (assistantText, context) => {
      shouldScrollToBottomRef.current = true
      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
        context
      })
    },
    [appendMessage]
  )

  const handleSubmit = async (text) => {
    // handle message
    const content = String(text ?? draft ?? '').trim()
    if (!content || isSending || submitInFlightRef.current) return

    submitInFlightRef.current = true
    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    const now = new Date()
    const createdAt = now.toISOString()

    const conversationId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const context = { ...routeContext, sentAt: createdAt }

    shouldScrollToBottomRef.current = true
    appendMessage({ id: buildMessageId(), role: 'user', content, createdAt, context })
    setDraft('')
    sendingStartedAtRef.current = Date.now()
    setSendingElapsedSec(0)
    setIsSending(true)
    setSendingStage(SENDING_STAGE.REQUESTING)
    sendingStagePlanRef.current = [SENDING_STAGE.REQUESTING, SENDING_STAGE.SCREEN_CHECK, SENDING_STAGE.ASSEMBLING]
    stageQueueRef.current = [SENDING_STAGE.SCREEN_CHECK, SENDING_STAGE.ASSEMBLING]
    displayedStageRef.current = SENDING_STAGE.IDLE
    const controller = new AbortController()
    abortRef.current = controller

    // rule check
    try {
      setSendingStage(SENDING_STAGE.SCREEN_CHECK)

      // local rule check

      // rule check
      const rule = await ruleCheck(routeAppKey, routeScreenKey, content, navigate, {
        groupId: selectedOrgs?.[0],
        siteId: selectedOrgs?.[1],
        userId: session?.userId,
        description: 'AI command from assistant panel',
        screenKey: routeScreenKey,
        signal: controller.signal
      })
      if (activeRequestIdRef.current !== requestId || controller.signal.aborted) return
      console.log(`rule`, rule)
      if (rule?.ok && rule.replyText) {
        setSendingStage(SENDING_STAGE.COMPLETED)
        await sleep(180)
        if (activeRequestIdRef.current !== requestId || controller.signal.aborted) return
        showAssistantReply(rule.replyText, context)
        void saveLocalChatHistory({
          author: session?.email || undefined,
          conversationId,
          currentApp: routeContext.appPrefix || undefined,
          currentPath: routeContext.pathname || undefined,
          chatAction: rule.ruleKey || 'local-rule',
          userMessage: content,
          assistantText: rule.replyText
        }).catch(() => undefined)
        return
      }

      // send message to backend
      setSendingStage(SENDING_STAGE.REQUESTING)
      const result = await requestAssistantReply({
        content,
        currentPath: pageContextOn ? routeContext.pathname : undefined,
        currentApp: pageContextOn ? routeContext.appPrefix || undefined : undefined,
        conversationId,
        author: session?.email || undefined,
        groupId: selectedOrgs?.[0],
        siteId: selectedOrgs?.[1],
        context: { ...routeContext },
        signal: controller.signal
      })
      if (activeRequestIdRef.current !== requestId || controller.signal.aborted) return

      const assistantText = extractAssistantText(result)

      setSendingStage(SENDING_STAGE.ASSEMBLING)
      await sleep(220)
      if (activeRequestIdRef.current !== requestId || controller.signal.aborted) return
      showAssistantReply(assistantText, context)
    } catch (error) {
      if (activeRequestIdRef.current === requestId && error?.name !== 'AbortError') {
        setSendingStage(SENDING_STAGE.COMPLETED)
        await sleep(180)
        if (activeRequestIdRef.current !== requestId) return
        showAssistantReply(error?.message || '답변을 가져오지 못했습니다.', context)
      }
    } finally {
      if (activeRequestIdRef.current !== requestId) return
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
      activeRequestIdRef.current += 1
      abortRef.current?.abort()
      abortRef.current = null
      if (stageTypingTimerRef.current) clearInterval(stageTypingTimerRef.current)
      if (stageAdvanceTimerRef.current) clearTimeout(stageAdvanceTimerRef.current)
      stageTypingTimerRef.current = null
      stageAdvanceTimerRef.current = null
      stageQueueRef.current = []
      displayedStageRef.current = SENDING_STAGE.IDLE
      sendingStartedAtRef.current = null
      submitInFlightRef.current = false
      setTypedStageLabel('')
      setSendingElapsedSec(0)
      setSendingStage(SENDING_STAGE.IDLE)
      setIsSending(false)

      const stoppedMessageId = buildMessageId()
      const stoppedMessage = '답변 생성이 중지되었습니다.'
      assistantMessageContentRef.current.set(stoppedMessageId, stoppedMessage)
      setTypedAssistantMessages((prev) => ({
        ...prev,
        [stoppedMessageId]: stoppedMessage
      }))
      shouldScrollToBottomRef.current = true
      appendMessage({
        id: stoppedMessageId,
        role: 'assistant',
        content: stoppedMessage,
        createdAt: new Date().toISOString(),
        context: { ...routeContext }
      })
      textareaRef.current?.focus()
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
  }, [appendMessage, isSending, messages, routeContext])

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
            <StyledAiAssistantMessageList ref={messageListRef} onScroll={handleMessageListScroll}>
              {isHistoryLoading && historyPageRef.current > 0 && (
                <div style={{ textAlign: 'center', color: '#848c9d', fontSize: '12px' }}>
                  이전 대화를 불러오는 중...
                </div>
              )}
              {messages.map((m, index) => {
                const dateKey = getChatDateKey(m.createdAt)
                const previousDateKey = getChatDateKey(messages[index - 1]?.createdAt)
                const isUserMessage = m.role === 'user'
                const displayedContent =
                  m.role === 'assistant' ? (typedAssistantMessages[m.id] ?? m.content) : m.content
                const helpContent = m.role === 'assistant' ? parseTmsHelpContent(displayedContent) : null
                const showNodeCommandTip =
                  m.role === 'assistant' && displayedContent.includes('노드 이름을 다시 확인해주세요')

                return (
                  <Fragment key={m.id}>
                    {dateKey && dateKey !== previousDateKey && (
                      <div
                        style={{
                          alignSelf: 'center',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: '#f1f3f5',
                          color: '#6b7280',
                          fontSize: '11px'
                        }}
                      >
                        {formatChatDate(m.createdAt)}
                      </div>
                    )}
                    <StyledAiAssistantMessage $role={m.role}>
                      <StyledAiAssistantMessageMeta>
                        {m.role === 'user' ? '나' : 'AI Assistant'} · {formatChatTime(m.createdAt)}
                      </StyledAiAssistantMessageMeta>

                      <StyledAiAssistantMessageBubble
                        $role={m.role}
                        role={isUserMessage ? 'button' : undefined}
                        tabIndex={isUserMessage ? 0 : undefined}
                        title={isUserMessage ? '클릭하여 다시 실행' : undefined}
                        aria-disabled={isUserMessage ? isSending : undefined}
                        onClick={isUserMessage && !isSending ? () => handleSubmit(m.content) : undefined}
                        onKeyDown={
                          isUserMessage && !isSending
                            ? (event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                event.preventDefault()
                                handleSubmit(m.content)
                              }
                            : undefined
                        }
                        style={isUserMessage ? { cursor: isSending ? 'default' : 'pointer' } : undefined}
                      >
                        {helpContent ? (
                          <StyledAiHelpContent>
                            {helpContent.intro && <StyledAiHelpIntro>{helpContent.intro}</StyledAiHelpIntro>}
                            {helpContent.sections.map((section) => (
                              <StyledAiHelpSection key={section.title}>
                                <StyledAiHelpSectionTitle>{section.title}</StyledAiHelpSectionTitle>
                                <StyledAiHelpCommandList>
                                  {section.commands.map((command, commandIndex) => (
                                    <StyledAiHelpCommand key={`${section.title}-${command.example}-${commandIndex}`}>
                                      <StyledAiHelpCommandExample>{command.example}</StyledAiHelpCommandExample>
                                      <StyledAiHelpCommandDescription>
                                        {command.description}
                                      </StyledAiHelpCommandDescription>
                                    </StyledAiHelpCommand>
                                  ))}
                                </StyledAiHelpCommandList>
                              </StyledAiHelpSection>
                            ))}
                          </StyledAiHelpContent>
                        ) : (
                          displayedContent
                        )}
                      </StyledAiAssistantMessageBubble>
                      {showNodeCommandTip && (
                        <StyledAiCommandTip>
                          <StyledAiCommandTipTitle>
                            단축 명령어를 활용하여 더 많은 노드 작업을 한번에 할 수 있어요.
                          </StyledAiCommandTipTitle>
                          <StyledAiCommandTipExamples>
                            <StyledAiCommandTipExample>A-&gt;B-&gt;C</StyledAiCommandTipExample>
                            <StyledAiCommandTipExample>A-&gt;B=&gt;C</StyledAiCommandTipExample>
                            <StyledAiCommandTipExample>-&gt;A-&gt;B</StyledAiCommandTipExample>
                            <StyledAiCommandTipExample>-&gt;A=&gt;C</StyledAiCommandTipExample>
                          </StyledAiCommandTipExamples>
                        </StyledAiCommandTip>
                      )}
                    </StyledAiAssistantMessage>
                  </Fragment>
                )
              })}

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
