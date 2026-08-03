import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { StyledPageContent, Section, Title, Button, Textarea, OrganizationSelector } from '@repo/ui'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { agentApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { PageHeadWrap } from '@/components/common/styles'

// 최종답변 마크다운 렌더링 (GFM 표 지원) — 표/셀/문단 스타일
const MD_COMPONENTS = {
  table: (props) => (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: '0.4rem 0', fontSize: '1.3rem' }} {...props} />
  ),
  th: (props) => (
    <th
      style={{
        border: '1px solid var(--color-neutral-30, #d1d6db)',
        padding: '0.5rem 0.8rem',
        background: 'var(--color-neutral-05, #f6f7f9)',
        textAlign: 'left',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}
      {...props}
    />
  ),
  td: (props) => (
    <td style={{ border: '1px solid var(--color-neutral-20, #e5e8eb)', padding: '0.5rem 0.8rem' }} {...props} />
  ),
  p: (props) => <p style={{ margin: '0.3rem 0' }} {...props} />,
  ul: (props) => <ul style={{ margin: '0.3rem 0', paddingLeft: '1.6rem' }} {...props} />,
  ol: (props) => <ol style={{ margin: '0.3rem 0', paddingLeft: '1.6rem' }} {...props} />,
  code: (props) => (
    <code
      style={{ background: 'var(--color-neutral-05, #f6f7f9)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}
      {...props}
    />
  )
}

const genSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}-${Date.now()}`

// 이벤트 타입별 표시 메타 (아이콘/색)
const STEP_META = {
  user: { icon: '🙋', color: 'var(--color-primary-60)' },
  thought: { icon: '🤔', color: 'var(--color-neutral-60)' },
  tool_call: { icon: '🔧', color: 'var(--color-secondary-60)' },
  tool_result: { icon: '📦', color: 'var(--color-neutral-70)' },
  confirmation_required: { icon: '⚠️', color: 'var(--color-warning-60, #c47f17)' },
  confirm_decision: { icon: '✋', color: 'var(--color-neutral-70)' },
  final_answer: { icon: '🤖', color: 'var(--color-primary-70)' },
  error: { icon: '⛔', color: 'var(--color-error-60, #d64545)' }
}

const AgentChat = () => {
  const { selectedOrgs, allOrgs, setSelectedOrgs } = useOrganizationStore()
  const session = useUserStore((s) => s.session)
  const userLevel = Number(session?.userLevel ?? 0)
  const isOperator = userLevel >= 2 // 운영자: tool 상세 로그 노출, 그 외(고객사): 요약만

  const [message, setMessage] = useState('')
  const [steps, setSteps] = useState([])
  const [running, setRunning] = useState(false)
  const [pending, setPending] = useState(null) // { confirmId, name, args }
  const [sessionId] = useState(() => genSessionId())
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [steps])

  // 최초 진입 시 org가 기본값('none')이면 '전체'로 초기화 (다른 페이지 방문 없이 바로 들어와도 유효 scope 보장)
  useEffect(() => {
    const [g, s] = selectedOrgs || []
    if ((g == null || g === 'none') && (s == null || s === 'none')) setSelectedOrgs(['all', 'all'])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const push = (ev) => setSteps((prev) => [...prev, ev])

  const handleEvent = (ev) => {
    if (ev?.type === 'confirmation_required') setPending({ confirmId: ev.confirmId, name: ev.name, args: ev.args })
    push(ev)
  }

  const run = async () => {
    const msg = message.trim()
    if (!msg || running) return
    setPending(null)
    setRunning(true)
    push({ type: 'user', text: msg })
    setMessage('')
    const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
    const payload = { message: msg, sessionId, userLevel }
    if (groupId != null) payload.groupId = groupId
    if (siteId != null) payload.siteId = siteId
    try {
      await agentApis.agentStream(payload, { onEvent: handleEvent })
    } catch (e) {
      push({ type: 'error', message: String(e?.message || e) })
    } finally {
      setRunning(false)
    }
  }

  const resolveConfirm = async (approved) => {
    if (!pending || running) return
    const { confirmId, name } = pending
    setPending(null)
    setRunning(true)
    push({ type: 'confirm_decision', text: approved ? `승인: ${name}` : `거부: ${name}` })
    try {
      await agentApis.agentConfirm({ confirmId, approved }, { onEvent: handleEvent })
    } catch (e) {
      push({ type: 'error', message: String(e?.message || e) })
    } finally {
      setRunning(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      run()
    }
  }

  const renderStep = (ev, idx) => {
    // 비운영자의 tool 진행은 요약이므로 진행 아이콘(⏳)·중립색으로 통일
    const isSummaryProgress = !isOperator && (ev.type === 'tool_call' || ev.type === 'tool_result')
    const meta = isSummaryProgress
      ? { icon: '⏳', color: 'var(--color-neutral-60)' }
      : STEP_META[ev.type] || STEP_META.thought
    let label = ''
    let detail = null
    switch (ev.type) {
      case 'user':
        label = ev.text
        break
      case 'thought':
        label = ev.text || '분석 중'
        break
      case 'tool_call':
        // 운영자: 도구명/인자 상세 / 비운영자: 내부 상세 없이 진행 요약만
        label = isOperator ? `API 호출: ${ev.name}${ev.confirmed ? ' (승인됨)' : ''}` : '요청을 처리하고 있어요…'
        if (isOperator && ev.args && Object.keys(ev.args).length > 0) {
          detail = JSON.stringify(ev.args, null, 2)
        }
        break
      case 'tool_result':
        label = isOperator
          ? ev.cancelled
            ? `실행 취소: ${ev.name}`
            : `결과: ${ev.name} ${ev.ok ? '성공' : '실패'} (HTTP ${ev.status})`
          : '결과를 정리하고 있어요…'
        break
      case 'confirmation_required':
        label = `확인 필요: ${ev.name} — 비가역 작업입니다.`
        if (isOperator && ev.args) detail = JSON.stringify(ev.args, null, 2)
        break
      case 'confirm_decision':
        label = ev.text
        break
      case 'final_answer':
        label = ev.text || '(응답 없음)'
        break
      case 'error':
        label = `오류: ${ev.message}`
        break
      default:
        label = JSON.stringify(ev)
    }

    // 진행 표시(요약)는 일시 노출 — 마지막 스텝일 때만 보이고, 다음 이벤트가 쌓이면 숨김.
    // thought(모든 사용자) + 비운영자의 tool_call/tool_result(요약 라벨)가 여기에 해당.
    // const isTransientProgress =
    //   ev.type === 'thought' || (!isOperator && (ev.type === 'tool_call' || ev.type === 'tool_result'))

    const isTransientProgress = !isOperator && (ev.type === 'tool_call' || ev.type === 'tool_result')
    if (isTransientProgress && idx !== steps.length - 1) return null

    const isBubble = ev.type === 'user' || ev.type === 'final_answer'
    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          justifyContent: ev.type === 'user' ? 'flex-end' : 'flex-start',
          margin: '0.6rem 0'
        }}
      >
        <div
          style={{
            maxWidth: ev.type === 'final_answer' ? '100%' : '80%',
            padding: isBubble ? '1rem 1.2rem' : '0.6rem 0.9rem',
            borderRadius: '0.8rem',
            background: isBubble
              ? ev.type === 'user'
                ? 'var(--color-primary-10, #eef2ff)'
                : 'var(--color-neutral-05, #f6f7f9)'
              : 'transparent',
            border: isBubble ? '1px solid var(--color-neutral-20, #e5e8eb)' : 'none',
            color: meta.color,
            fontSize: isBubble ? '1.4rem' : '1.25rem',
            whiteSpace: ev.type === 'final_answer' ? 'normal' : 'pre-wrap',
            wordBreak: 'break-word',
            overflowX: 'auto'
          }}
        >
          {ev.type === 'final_answer' ? (
            <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--color-neutral-90, #191f28)' }}>
              <span>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                  {ev.text || '(응답 없음)'}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <>
              <span style={{ marginRight: '0.4rem' }}>{meta.icon}</span>
              <span style={{ color: isBubble ? 'var(--color-neutral-90, #191f28)' : meta.color }}>{label}</span>
            </>
          )}
          {detail && (
            <pre
              style={{
                marginTop: '0.4rem',
                padding: '0.6rem',
                background: 'var(--color-neutral-05, #f6f7f9)',
                borderRadius: '0.4rem',
                fontSize: '1.1rem',
                overflowX: 'auto'
              }}
            >
              {detail}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <StyledPageContent className="column" style={{ height: '100%' }}>
      <Title>AI 에이전트</Title>

      <OrganizationSelector supportAlls={[true, true]} />

      <Section gap="1.6rem">
        <div style={{ fontSize: '1.25rem', color: 'var(--color-neutral-60)' }}>
          자연어로 명령하면 필요한 CMS API를 스스로 호출해 처리합니다. (권한:{' '}
          {isOperator ? '운영자 — 전체 도구·상세 로그' : '고객사 — 조회·요약'})
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            border: '1px solid var(--color-neutral-20, #e5e8eb)',
            borderRadius: '0.8rem',
            padding: '1.2rem',
            background: '#fff'
          }}
        >
          {steps.length === 0 ? (
            <div style={{ color: 'var(--color-neutral-50)', textAlign: 'center', padding: '4rem 0' }}>
              예: “콘텐츠 목록 보여줘”, “라벨 종류 알려줘”, “로봇 액션 목록”
            </div>
          ) : (
            steps.map(renderStep)
          )}

          {pending && (
            <div
              style={{
                marginTop: '0.8rem',
                padding: '1rem',
                border: '1px solid var(--color-warning-40, #f0c36d)',
                borderRadius: '0.6rem',
                background: 'var(--color-warning-05, #fff8ec)'
              }}
            >
              <div style={{ marginBottom: '0.6rem', fontSize: '1.3rem' }}>
                ⚠️ <b>{pending.name}</b> 실행을 승인하시겠어요? (비가역)
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <Button size="sm" variant="contained" disabled={running} onClick={() => resolveConfirm(true)}>
                  승인
                </Button>
                <Button size="sm" theme="delete" disabled={running} onClick={() => resolveConfirm(false)}>
                  거부
                </Button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Textarea
              value={message}
              placeholder="명령을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={running || !!pending}
            />
          </div>
          <Button variant="contained" disabled={running || !!pending || !message.trim()} onClick={run}>
            {running ? '처리 중…' : '실행'}
          </Button>
        </div>
      </Section>
    </StyledPageContent>
  )
}

export default AgentChat
