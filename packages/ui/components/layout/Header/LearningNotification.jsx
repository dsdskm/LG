import { useRef, useState } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import useToggle from '@repo/hooks/useToggle'
import useClickOutSide from '@repo/hooks/useClickOutSide'

// ── Mock data ─────────────────────────────────────────────────────────────────
// TODO: API 엔드포인트 확정 후 아래로 교체
// import { getLearningNotifications } from '@repo/apis/learning/notificationApis'
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'model_complete',
    title: '모델 학습 완료',
    message: 'Robot_Arm_v2.1 모델 학습이 완료되었습니다.',
    source: 'learn',
    time: '2분 전',
    read: false
  },
  {
    id: 2,
    type: 'data_ready',
    title: '데이터 준비 완료',
    message: '1,240개 에피소드 데이터가 준비되었습니다.',
    source: 'learn',
    time: '15분 전',
    read: false
  },
  {
    id: 3,
    type: 'review_required',
    title: '검토 요청',
    message: '12개 에피소드가 검토 승인을 기다리고 있습니다.',
    source: 'learn',
    time: '1시간 전',
    read: false
  },
  {
    id: 4,
    type: 'deploy_complete',
    title: '모델 배포 완료',
    message: 'Site-A 로봇 3대에 v2.0 모델이 배포되었습니다.',
    source: 'ota',
    time: '2시간 전',
    read: true
  },
  {
    id: 5,
    type: 'training_failed',
    title: '학습 실패',
    message: 'Episode 시뮬레이션 검증 실패 — validation_error',
    source: 'learn',
    time: '3시간 전',
    read: true
  },
  {
    id: 6,
    type: 'simulation_complete',
    title: '시뮬레이션 완료',
    message: '3,766개 에피소드 시뮬레이션이 완료되었습니다.',
    source: 'learn',
    time: '4시간 전',
    read: true
  }
]

const TYPE_CONFIG = {
  model_complete:      { label: '학습 완료',   color: '#16a34a', bg: '#dcfce7', symbol: '✓' },
  data_ready:          { label: '데이터 완료', color: '#2563eb', bg: '#dbeafe', symbol: '◉' },
  review_required:     { label: '검토 요청',   color: '#d97706', bg: '#fef3c7', symbol: '!' },
  deploy_complete:     { label: '배포 완료',   color: '#7c3aed', bg: '#ede9fe', symbol: '▲' },
  training_failed:     { label: '학습 실패',   color: '#dc2626', bg: '#fee2e2', symbol: '✕' },
  simulation_complete: { label: '시뮬레이션',  color: '#0891b2', bg: '#cffafe', symbol: '◎' }
}

const SOURCE_STYLE = {
  learn: { bg: '#eef2ff', color: '#4338ca' },
  ota:   { bg: '#fff7ed', color: '#c2410c' }
}

// ── SVG 아이콘: 학사모 (학습 상징) ───────────────────────────────────────────
const GraduationCapIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
)

// ── Styled Components ─────────────────────────────────────────────────────────
const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

const TriggerBtn = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem;
  border-radius: var(--radius-xs);
  color: white;
  transition: background 0.15s;

  &:hover {
    background: var(--alpha-black-20);
  }
  &:active {
    background: var(--alpha-black-40);
  }
`

const UnreadBadge = styled.span`
  position: absolute;
  top: 1px;
  right: 1px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  padding: 0 3px;
  pointer-events: none;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
`

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: -60px;
  width: 360px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.07);
  z-index: 1000;
  overflow: hidden;

  @media (max-width: 480px) {
    right: -100px;
    width: 320px;
  }
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 11px;
  border-bottom: 1px solid #f1f5f9;
`

const PanelTitle = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 7px;
`

const CountPill = styled.span`
  background: #ef4444;
  color: #fff;
  border-radius: 9px;
  padding: 1px 6px;
  font-size: 1.1rem;
  font-weight: 700;
`

const MarkAllBtn = styled.button`
  font-size: 1.2rem;
  color: #6366f1;
  font-weight: 600;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const List = styled.ul`
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 2px;
  }
`

const Item = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  background: ${({ $read }) => ($read ? 'transparent' : '#f8f9ff')};
  border-left: 3px solid ${({ $read }) => ($read ? 'transparent' : '#6366f1')};
  transition: background 0.12s;

  &:hover {
    background: #f8f9ff;
  }
`

const TypeIconBox = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 1px;
`

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`

const ItemTitle = styled.div`
  font-size: 1.3rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
`

const ItemMsg = styled.div`
  font-size: 1.2rem;
  color: #64748b;
  line-height: 1.4;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const SourceTag = styled.span`
  background: ${({ $source }) => SOURCE_STYLE[$source]?.bg ?? '#f1f5f9'};
  color: ${({ $source }) => SOURCE_STYLE[$source]?.color ?? '#475569'};
  font-size: 1rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const ItemTime = styled.span`
  font-size: 1.1rem;
  color: #94a3b8;
`

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
  margin-top: 5px;
`

const Empty = styled.div`
  padding: 36px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 1.3rem;
`

// ── Component ─────────────────────────────────────────────────────────────────
const LearningNotification = () => {
  const { t } = useTranslation('layout')
  const [items, setItems] = useState(MOCK_NOTIFICATIONS)
  const { state: isOpen, toggle, off: close } = useToggle()
  const wrapperRef = useRef(null)
  useClickOutSide(wrapperRef, close)

  const unread = items.filter((n) => !n.read).length

  const handleMarkAll = (e) => {
    e.stopPropagation()
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleMarkRead = (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <Wrapper ref={wrapperRef}>
      <TriggerBtn type="button" onClick={toggle} title="학습 알림">
        <GraduationCapIcon size={20} color="white" />
        {unread > 0 && <UnreadBadge>{unread > 9 ? '9+' : unread}</UnreadBadge>}
      </TriggerBtn>

      {isOpen && (
        <Panel>
          <PanelHeader>
            <PanelTitle>
              {t('LearningNotification.panelTitle')}
              {unread > 0 && <CountPill>{unread}</CountPill>}
            </PanelTitle>
            {unread > 0 && (
              <MarkAllBtn type="button" onClick={handleMarkAll}>
                {t('LearningNotification.markAll')}
              </MarkAllBtn>
            )}
          </PanelHeader>

          <List>
            {items.length === 0 ? (
              <Empty>{t('LearningNotification.empty')}</Empty>
            ) : (
              items.map((n) => {
                const conf = TYPE_CONFIG[n.type] ?? { color: '#64748b', bg: '#f1f5f9', symbol: '·' }
                return (
                  <Item key={n.id} $read={n.read} onClick={() => handleMarkRead(n.id)}>
                    <TypeIconBox $bg={conf.bg} $color={conf.color}>
                      {conf.symbol}
                    </TypeIconBox>
                    <ItemBody>
                      <ItemTitle>{n.title}</ItemTitle>
                      <ItemMsg title={n.message}>{n.message}</ItemMsg>
                      <ItemMeta>
                        <SourceTag $source={n.source}>{n.source}</SourceTag>
                        <ItemTime>{n.time}</ItemTime>
                      </ItemMeta>
                    </ItemBody>
                    {!n.read && <UnreadDot />}
                  </Item>
                )
              })
            )}
          </List>
        </Panel>
      )}
    </Wrapper>
  )
}

export default LearningNotification
