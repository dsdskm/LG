import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAiAssistantStore, useUserStore, useOrganizationStore, useAiLogEventStore } from '@repo/stores'
import { getAppPrefix } from '@repo/utils'
import Icon from '../../common/Icon'
import {
  StyledAiAssistantComposer,
  StyledAiAssistantContextBadge,
  StyledAiAssistantContextList,
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
  StyledAiSuggestChip,
  StyledAiSuggestLabel,
  StyledAiSuggestions,
  StyledAiAssistantPanelTitle,
} from './styles'
import { postSiteAssistantChat } from '@repo/apis/ai/chat.js'

const DEFAULT_SUGGESTIONS = [
  '현재 화면에서 할 수 있는 작업은 무엇인가요?',
]

const ROUTE_SUGGESTIONS = [
  {
    matcher: (pathname) => pathname.includes('/robot/dashboard'),
    suggestions: [
      '브리핑 해줘',
      '오늘 주요 이슈는 뭐가 있어?',
      'TMS 화면으로 이동해줘'
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/report'),
    suggestions: [
      '리포트 디자인 변경해도되?',
      '리포트에 정보를 추가하고 싶어'
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/assignees'),
    suggestions: [
      '주행 문제 담당자는 누구야?',
      '담당자별 처리 현황을 요약해줘',
      '미처리 로그가 있다면 누가 확인해야 해?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/prompt'),
    suggestions: [
      '현재 프롬프트 설정이 어떤 역할을 하는지 설명해줘',
      'AI 로그 분석 프롬프트를 개선하려면 뭘 봐야 해?',
      '기능별 Prompt와 공통 Prompt 차이를 알려줘',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/func'),
    suggestions: [
      '주행 분석 기능은 어떤 기준으로 로그를 분류해?',
      'BSP 분석은 어떤 문제를 판단하는 거야?',
      '새 분석 기능을 추가하려면 어떤 정보를 입력해야 해?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/stats'),
    suggestions: [
      '최근 가장 많이 발생한 이슈는 뭐야?',
      '어떤 로봇에서 문제가 가장 많이 발생했어?',
      '시간대별로 이슈가 몰리는 구간이 있어?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/action'),
    suggestions: [
      '액션은 언제 수행되는거야?',
      '액션을 등록하고 싶어',
      '액션은 어떻게 연결이 되는거야?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/ailog/event'),
    suggestions: [
      '오늘 이슈 보여줘',
      '주행 기능 이슈 보여줘',
      '배터리 이슈 보여줘',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/management'),
    suggestions: [
      '문제가 있는 로봇을 어떻게 확인하면 돼?',
      '로봇 상세 정보에서 어떤 항목을 봐야 해?',
      '로봇 상태가 비정상일 때 확인할 순서를 알려줘',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/groups'),
    suggestions: [
      '그룹과 사이트는 어떤 기준으로 관리하면 돼?',
      '특정 사이트의 로봇 현황을 확인하려면 어떻게 해?',
      '그룹 관리에서 주의해야 할 설정은 뭐야?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/robot/users'),
    suggestions: [
      '사용자 권한은 어떤 기준으로 확인하면 돼?',
      '사용자별 접근 권한을 확인하려면 어디를 봐야 해?',
      '운영자 계정을 추가할 때 주의할 점은 뭐야?',
    ],
  },
  {
    matcher: (pathname) => pathname.includes('/tms'),
    suggestions: [
      'TaskFlow가 뭐야?',
      'TaskFlow 생성하고 싶어',
      'TaskFlow 생성 규칙에 대해 알려줘',
    ],
  },
]

const getSuggestionsByPathname = (pathname) => {
  const matched = ROUTE_SUGGESTIONS.find((item) => item.matcher(pathname))
  return matched?.suggestions ?? DEFAULT_SUGGESTIONS
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
  const [pageContextOn, setPageContextOn] = useState(true)

  const messageListRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  // 멀티턴: 직전에 이벤트 표에 적용된 필터. 후속 발화("심각도 높음만") 병합 기준.
  const lastFiltersRef = useRef(null)

  const routeContext = useMemo(() => buildRouteContext(location), [location])

  const suggestions = useMemo(
    () => getSuggestionsByPathname(routeContext.pathname),
    [routeContext.pathname]
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

  // 설정 페이지로 이동. 다른 앱이면 전체 로드, 같은 앱이면 SPA 네비게이션.
  const handleOpenSettings = useCallback(() => {
    const target = '/robot/ailog/chat-settings'
    const isCrossApp = getAppPrefix(target) !== getAppPrefix(location.pathname)
    if (isCrossApp) window.location.href = '/' + target.replace(/^\//, '')
    else navigate(target)
  }, [navigate, location.pathname])

  const handleBackToInitial = () => {
    if (isSending) return
    resetMessages()
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
          const path = param?.path
          if (!path) break
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
    [navigate, location.pathname]
  )

  const handleSubmit = async (text) => {
    const content = (text ?? draft).trim()
    if (!content || isSending) return

    const createdAt = new Date().toISOString()
    const now = new Date()
    const conversationId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const context = { ...routeContext, sentAt: createdAt }

    appendMessage({ id: buildMessageId(), role: 'user', content, createdAt, context })
    setDraft('')
    setIsSending(true)

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
      appendMessage({
        id: buildMessageId(),
        role: 'assistant',
        content: extractAssistantText(result),
        createdAt: new Date().toISOString(),
        context,
      })

      const data = result?.data ?? {}
      const chat_action = data.chat_action
      const chat_action_param = data.chat_action_param

      handleChatAction(chat_action, chat_action_param)

    } catch (error) {
      // 사용자가 "중지" 를 눌러 취소한 경우: 에러 메시지 대신 안내만.
      if (error?.name === 'AbortError') {
        appendMessage({
          id: buildMessageId(),
          role: 'assistant',
          content: '답변 생성을 중지했습니다.',
          createdAt: new Date().toISOString(),
          context,
        })
      } else {
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

                <StyledAiGreetingLine
                  style={{
                    fontSize: '1.3rem',
                    color: 'var(--color-secondary-60, #6b7280)',
                  }}
                >
                  현재 화면 기반으로 질문에 답변합니다.
                </StyledAiGreetingLine>

                <StyledAiAssistantContextList>
                  <StyledAiAssistantContextBadge>
                    앱: {routeContext.appPrefix || 'root'}
                  </StyledAiAssistantContextBadge>
                  <StyledAiAssistantContextBadge>
                    화면: {routeContext.pathname}
                  </StyledAiAssistantContextBadge>
                </StyledAiAssistantContextList>

                <StyledAiGreetingCta>
                  무엇을 도와드릴까요?
                </StyledAiGreetingCta>
              </StyledAiGreeting>

              <StyledAiSuggestions>
                <StyledAiSuggestLabel>
                  이런 질문 어떠세요?
                </StyledAiSuggestLabel>

                {suggestions.map((s) => (
                  <StyledAiSuggestChip
                    key={s}
                    type="button"
                    onClick={() => handleSubmit(s)}
                  >
                    {s}
                  </StyledAiSuggestChip>
                ))}
              </StyledAiSuggestions>
            </>
          ) : (
            <StyledAiAssistantMessageList ref={messageListRef}>
              {messages.map((m) => (
                <StyledAiAssistantMessage key={m.id} $role={m.role}>
                  <StyledAiAssistantMessageMeta>
                    {m.role === 'user' ? '나' : 'AI Assistant'}
                  </StyledAiAssistantMessageMeta>

                  <StyledAiAssistantMessageBubble $role={m.role}>
                    {m.content}
                  </StyledAiAssistantMessageBubble>
                </StyledAiAssistantMessage>
              ))}

              {isSending && (
                <StyledAiAssistantMessage $role="assistant">
                  <StyledAiAssistantLoadingBubble>
                    <StyledAiAssistantLoadingRow>
                      <StyledAiAssistantLoadingDots>
                        <span />
                        <span />
                        <span />
                      </StyledAiAssistantLoadingDots>
                      <StyledAiAssistantLoadingText>
                        작성 중...
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