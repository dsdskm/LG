import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAiAssistantStore, useUserStore, useOrganizationStore, useAiLogEventStore } from '@repo/stores'
import { getAppPrefix } from '@repo/utils'
import { getChatSettings } from '@repo/apis/ai/chatSettings.js'
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
  StyledAiAssistantMessageList,
  StyledAiAssistantMessageMeta,
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
} from './styles'
import { postSiteAssistantChat } from '@repo/apis/ai/chat.js'

const ENABLE_QUICK_COMMANDS = true
const ENABLE_MESSAGE_SUGGESTED_ACTIONS = false

const SENDING_STAGE = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  THINKING: 'thinking',
  GENERATING: 'generating',
  COMPLETED: 'completed',
}

const SENDING_STAGE_LABEL = {
  [SENDING_STAGE.REQUESTING]: '요청중',
  [SENDING_STAGE.THINKING]: '생각중',
  [SENDING_STAGE.GENERATING]: '응답생성중',
  [SENDING_STAGE.COMPLETED]: '응답완료',
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

const normalizeRouteKey = (value) => String(value ?? '').trim().replace(/^\/+/, '')

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

  const candidates = (Array.isArray(guidanceItems) ? guidanceItems : [])
    .map((item) => {
      const key = normalizeRouteKey(item?.key ?? item?.routeKey)
      const examples = Array.isArray(item?.examples) ? item.examples : []
      return { key, examples }
    })
    .filter((item) => item.key && item.examples.length > 0)
    .filter((item) => normalizedPath === item.key || normalizedPath.startsWith(`${item.key}/`))
    .sort((left, right) => right.key.length - left.key.length)

  const matched = candidates[0]
  if (matched) {
    return extractExampleTexts(matched.examples)
  }

  // 설정 페이지는 화면별 guidance가 없을 수 있어 앱 단위 추천메세지를 fallback 노출.
  if (normalizedPath.endsWith('ai-chat-settings')) {
    const appPrefix = normalizedPath.split('/')[0] ?? ''
    if (!appPrefix) return []

    const appExamples = candidates
      .filter((item) => item.key.startsWith(`${appPrefix}/`))
      .flatMap((item) => extractExampleTexts(item.examples))

    return uniqueTexts(appExamples).slice(0, 12)
  }

  return []
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
  title: typeof document !== 'undefined' ? document.title : '',
})

const extractAssistantText = (result) => {
  const payload = result?.data ?? result ?? null
  if (!payload) return '응답을 받았지만 표시할 수 있는 내용이 없습니다.'
  if (typeof payload === 'string') return payload
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim()
  if (typeof payload?.content === 'string' && payload.content.trim()) return payload.content.trim()
  if (typeof payload?.text === 'string' && payload.text.trim()) return payload.text.trim()
  if (typeof payload?.answer === 'string' && payload.answer.trim()) return payload.answer.trim()
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return '응답을 해석하지 못했습니다.'
  }
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
      const chatActionParam = item?.chat_action_param && typeof item.chat_action_param === 'object'
        ? item.chat_action_param
        : undefined

      if (!label || !chatAction) return null

      return {
        id,
        label,
        keyword,
        chatAction,
        chatActionParam,
      }
    })
    .filter(Boolean)
    .slice(0, 3)
}

const PATH_PARAM_LABELS = {
  robotId: '로봇 아이디',
}

const extractPathParams = (path) => {
  const normalized = String(path ?? '').trim().replace(/^\/+/, '')
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
  const normalized = String(pathTemplate ?? '').trim().replace(/^\/+/, '')
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
  const normalized = String(pathTemplate ?? '').trim().replace(/^\/+/, '')

  if (normalized.startsWith('robot/robots/:robotId/detail')) {
    return [
      {
        id: 'fallback-robot-management',
        label: '로봇 목록 화면으로 이동',
        keyword: '로봇 상세 이동이 어려우면 목록에서 직접 선택',
        chatAction: 'navigation',
        chatActionParam: { path: 'robot/management', app: 'robot' },
      },
    ]
  }

  return []
}

const STORAGE_KEY = 'ai-assistant-trigger-y'

const getInitialY = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return Math.max(60, Math.min(window.innerHeight - 60, parseInt(saved, 10)))
  } catch { }
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
    } catch { }
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

const AiAssistantPanel = ({ greetingExtra }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useUserStore((state) => state.session)
  const selectedOrgs = useOrganizationStore((state) => state.selectedOrgs)

  const isOpen = useAiAssistantStore((state) => state.isOpen)
  const openPanel = useAiAssistantStore((state) => state.openPanel)
  const closePanel = useAiAssistantStore((state) => state.closePanel)
  const messages = useAiAssistantStore((state) => state.messages)
  const appendMessage = useAiAssistantStore((state) => state.appendMessage)
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

  const messageListRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const sendingStartedAtRef = useRef(null)
  const assistantTypingTimerRef = useRef(null)
  // 멀티턴: 직전에 이벤트 표에 적용된 필터. 후속 발화("심각도 높음만") 병합 기준.
  const lastFiltersRef = useRef(null)

  const routeContext = useMemo(() => buildRouteContext(location), [location])

  const quickCommands = useMemo(
    () => pickRandomItems(screenSuggestions, Math.min(3, screenSuggestions.length)),
    [screenSuggestions, isOpen]
  )

  const hasConversation = messages.some((m) => m.role === 'user')

  const userName = session?.email
    ? session.email.split('@')[0].replace(/[._-]/g, ' ')
    : null

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages, isSending, isOpen])

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isSending) return undefined

    const toThinking = setTimeout(() => {
      setSendingStage((prev) => (prev === SENDING_STAGE.REQUESTING ? SENDING_STAGE.THINKING : prev))
    }, 350)

    const toGenerating = setTimeout(() => {
      setSendingStage((prev) => (
        prev === SENDING_STAGE.REQUESTING || prev === SENDING_STAGE.THINKING
          ? SENDING_STAGE.GENERATING
          : prev
      ))
    }, 1100)

    return () => {
      clearTimeout(toThinking)
      clearTimeout(toGenerating)
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
      setTypedStageLabel('')
      return undefined
    }

    const fullLabel = SENDING_STAGE_LABEL[sendingStage] || '작업중'
    let index = 0
    setTypedStageLabel('')

    const timer = setInterval(() => {
      index += 1
      setTypedStageLabel(fullLabel.slice(0, index))
      if (index >= fullLabel.length) {
        clearInterval(timer)
      }
    }, TYPEWRITER_INTERVAL_MS)

    return () => {
      clearInterval(timer)
    }
  }, [isSending, sendingStage])

  useEffect(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((m) => m?.role === 'assistant' && typeof m?.content === 'string')

    if (!latestAssistantMessage) return undefined

    const targetId = String(latestAssistantMessage.id ?? '')
    const fullText = String(latestAssistantMessage.content ?? '')
    if (!targetId || !fullText) return undefined

    const currentTyped = String(typedAssistantMessages[targetId] ?? '')
    if (currentTyped.length >= fullText.length) return undefined

    if (assistantTypingTimerRef.current) {
      clearInterval(assistantTypingTimerRef.current)
      assistantTypingTimerRef.current = null
    }

    setTypedAssistantMessages((prev) => ({
      ...prev,
      [targetId]: '',
    }))

    let index = 0
    assistantTypingTimerRef.current = setInterval(() => {
      index += 1
      const next = fullText.slice(0, index)
      setTypedAssistantMessages((prev) => ({
        ...prev,
        [targetId]: next,
      }))

      if (index >= fullText.length) {
        if (assistantTypingTimerRef.current) {
          clearInterval(assistantTypingTimerRef.current)
          assistantTypingTimerRef.current = null
        }
      }
    }, ASSISTANT_TYPEWRITER_INTERVAL_MS)

    return () => {
      if (assistantTypingTimerRef.current) {
        clearInterval(assistantTypingTimerRef.current)
        assistantTypingTimerRef.current = null
      }
    }
  }, [messages])

  useEffect(() => {
    return () => {
      if (assistantTypingTimerRef.current) {
        clearInterval(assistantTypingTimerRef.current)
        assistantTypingTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSuggestions = async () => {
      try {
        const response = await getChatSettings()
        if (cancelled) return

        const guidanceItems = response?.data?.management?.guidance ?? []
        const examples = findGuidanceExamplesForPath(guidanceItems, routeContext.pathname)
        setScreenSuggestions(examples)
      } catch {
        if (!cancelled) setScreenSuggestions([])
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

  // chat_action 분기 처리.
  const handleChatAction = useCallback(
    (chatAction, param) => {

      switch (chatAction) {
        // 화면 이동
        case 'navigation': {
          const path = String(param?.path ?? '').trim().replace(/^\/+/, '')
          if (!path) break
          const pathParams = extractPathParams(path)

          if (pathParams.length > 0) {
            const primaryParamLabel = resolveParamLabel(pathParams[0])
            const fallbackActions = buildNavigationFallbackActions(path)

            setPendingNavigation({
              pathTemplate: path,
              app: String(param?.app ?? '').trim() || undefined,
              paramNames: pathParams,
              screenName: String(param?.screenName ?? '').trim() || undefined,
              fallbackActions,
            })

            appendMessage({
              id: buildMessageId(),
              role: 'assistant',
              content: `${primaryParamLabel}를 알려주세요.`,
              suggestedActions: fallbackActions,
              createdAt: new Date().toISOString(),
              context: routeContext,
            })
            break
          }

          setPendingNavigation(null)
          const isCrossApp = getAppPrefix(path) !== getAppPrefix(location.pathname)
          if (isCrossApp) window.location.href = '/' + path
          else navigate(path)
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
    if (!content || isSending) return

    const createdAt = new Date().toISOString()
    const now = new Date()
    const conversationId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const context = { ...routeContext, sentAt: createdAt }

    appendMessage({ id: buildMessageId(), role: 'user', content, createdAt, context })

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
          context,
        })
        return
      }

      const resolvedPath = fillPathTemplate(pendingNavigation.pathTemplate, parsedParams)
      if (!resolvedPath || extractPathParams(resolvedPath).length > 0) {
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: '상세 화면 이동이 어려워서 대체 화면을 제안드릴게요.',
          suggestedActions: pendingNavigation.fallbackActions ?? [],
          createdAt: new Date().toISOString(),
          context,
        })
        return
      }

      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: '네 상세화면으로 이동하겠습니다.',
        suggestedActions: pendingNavigation.fallbackActions ?? [],
        createdAt: new Date().toISOString(),
        context,
      })

      setPendingNavigation(null)
      setDraft('')

      const isCrossApp = getAppPrefix(resolvedPath) !== getAppPrefix(location.pathname)
      if (isCrossApp) window.location.href = '/' + resolvedPath
      else navigate(resolvedPath)
      return
    }

    setDraft('')
    sendingStartedAtRef.current = Date.now()
    setSendingElapsedSec(0)
    setIsSending(true)
    setSendingStage(SENDING_STAGE.REQUESTING)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await postSiteAssistantChat({
        message: content,
        currentPath: pageContextOn ? routeContext.pathname : undefined,
        currentApp: pageContextOn ? (routeContext.appPrefix || undefined) : undefined,
        conversationId,
        // 작성자(대화기록 저장용)
        author: session?.email || undefined,
        // data/action 인텐트에서 robot/AI API 호출에 필요한 자격증명·엔드포인트
        accessToken: session?.accessToken,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        eventAnalyzerUrl: import.meta.env.VITE_EVENT_ANALYZER_URL,
        configManagerUrl: import.meta.env.VITE_CONFIG_MANAGER_URL,
        previousFilters: lastFiltersRef.current || undefined,
        context: {
          groupId: selectedOrgs?.[0],
          siteId: selectedOrgs?.[1],
        },
        signal: controller.signal,
      })

      console.log(`result`, result)
      const data = result?.data ?? {}
      const chat_action = data.chat_action
      const chat_action_param = data.chat_action_param
      const navigationPath = String(chat_action_param?.path ?? '').trim().replace(/^\/+/, '')
      const hasNavigationParams = chat_action === 'navigation' && extractPathParams(navigationPath).length > 0
      const suggestedActions = chat_action === 'ailog/event/filter' ? [] : extractSuggestedActions(result)

      setSendingStage(SENDING_STAGE.COMPLETED)
      await sleep(280)

      if (!hasNavigationParams) {
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: extractAssistantText(result),
          suggestedActions,
          createdAt: new Date().toISOString(),
          context,
        })
      }

      handleChatAction(chat_action, chat_action_param)

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
          context,
        })
      } else {
        setSendingStage(SENDING_STAGE.COMPLETED)
        await sleep(180)
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: error?.message || '답변을 가져오지 못했습니다.',
          createdAt: new Date().toISOString(),
          context,
        })
      }
    } finally {
      abortRef.current = null
      setIsSending(false)
      setSendingStage(SENDING_STAGE.IDLE)
      sendingStartedAtRef.current = null
      textareaRef.current?.focus()
    }
  }

  // 답변 생성 중지
  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!draft.trim() || isSending) return
      handleSubmit()
    }
  }

  return (
    <StyledAiAssistantDock $isOpen={isOpen}>
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

          {isOpen && (
            <StyledAiAssistantPanelTitle>
              AI Assistant
            </StyledAiAssistantPanelTitle>
          )}
        </StyledAiHeaderLeft>

        <StyledAiHeaderActions>
          {isOpen && (
            <StyledAiAssistantDockToggle
              onClick={handleOpenSettings}
              title="채팅 설정"
              type="button"
            >
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

                {greetingExtra && (
                  <div style={{ margin: '8px 0' }}>
                    {greetingExtra}
                  </div>
                )}

                <StyledAiGreetingCta>
                  무엇을 도와드릴까요?
                </StyledAiGreetingCta>
              </StyledAiGreeting>

              {ENABLE_QUICK_COMMANDS && quickCommands.length > 0 ? (
                <div style={{ padding: '0 1.6rem 1.2rem' }}>
                  <StyledAiAssistantMessage $role="assistant">
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
                      아래 명령어를 추천드려요.
                    </div>
                    <StyledAiActionCards>
                      {quickCommands.map((command) => (
                        <StyledAiActionCard
                          key={command}
                          type="button"
                          onClick={() => handleSubmit(command)}
                        >
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
                    {m.role === 'assistant'
                      ? (typedAssistantMessages[m.id] ?? m.content)
                      : m.content}
                  </StyledAiAssistantMessageBubble>

                  {ENABLE_MESSAGE_SUGGESTED_ACTIONS && m.role === 'assistant' && Array.isArray(m.suggestedActions) && m.suggestedActions.length > 0 && (
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
                            {item.keyword ? <StyledAiActionCardKeyword>{item.keyword}</StyledAiActionCardKeyword> : null}
                          </StyledAiActionCard>
                        ))}
                      </StyledAiActionCards>
                    </>
                  )}
                </StyledAiAssistantMessage>
              ))}

              {isSending && (
                <StyledAiAssistantMessage $role="assistant">
                  <StyledAiAssistantLoadingBubble
                    $stage={sendingStage}
                    $elapsed={sendingElapsedSec}
                  >
                    <StyledAiAssistantLoadingRow>
                      <StyledAiAssistantLoadingDots
                        $stage={sendingStage}
                        $elapsed={sendingElapsedSec}
                      >
                        <span />
                        <span />
                        <span />
                      </StyledAiAssistantLoadingDots>
                      <StyledAiAssistantLoadingText
                        $stage={sendingStage}
                        $elapsed={sendingElapsedSec}
                      >
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
                placeholder="현재 화면에 대해 질문해 보세요."
                readOnly={isSending}
                rows={3}
              />

              <StyledAiComposerFooter>
                <StyledAiContextChips>
                  {hasConversation && (
                    <StyledAiContextChip
                      type="button"
                      onClick={handleBackToInitial}
                      disabled={isSending}
                    >
                      대화 초기화
                    </StyledAiContextChip>
                  )}
                </StyledAiContextChips>

                {isSending ? (
                  <StyledAiSendButton
                    type="button"
                    onClick={handleStop}
                    title="중지"
                  >
                    ■
                  </StyledAiSendButton>
                ) : (
                  <StyledAiSendButton
                    type="submit"
                    disabled={!draft.trim()}
                    title="전송"
                  >
                    ↑
                  </StyledAiSendButton>
                )}
              </StyledAiComposerFooter>
            </StyledAiComposerBox>
          </StyledAiAssistantComposer>

          <StyledAiDisclaimer>
            AI 답변은 오류가 포함될 수 있습니다. 내용을 확인 후 활용해 주세요.
          </StyledAiDisclaimer>
        </StyledAiAssistantDockBody>
      )}
    </StyledAiAssistantDock>
  )
}

export default AiAssistantPanel