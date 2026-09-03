import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import useToggle from '@repo/hooks/useToggle'
import useClickOutSide from '@repo/hooks/useClickOutSide'
import SvgNotification from '@repo/ui/assets/svgs/notification.svg'
import { useUserStore } from '@repo/stores'
import { deviceApis } from '@/apis'
import { getRelativeTimeParts } from '@/utils/dateUtils'
import { getReadIds, saveReadIds, makeNotificationId } from '@/utils/notificationReadStore'

const SOURCE_CONFIG = {
  ERROR: { color: '#dc2626', bg: '#fee2e2', symbol: '!' },
  FAULT: { color: '#d97706', bg: '#fef3c7', symbol: '!' },
  NOTIFICATION: { color: '#2563eb', bg: '#dbeafe', symbol: 'i' }
}
const DEFAULT_SOURCE_CONFIG = { color: '#64748b', bg: '#f1f5f9', symbol: '•' }

const SEEN_THRESHOLD = 0.6

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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  pointer-events: none;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
`

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: -60px;
  width: 380px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.14),
    0 2px 8px rgba(0, 0, 0, 0.06);
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

const PanelTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const PanelTitle = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
`

const UnreadPill = styled.span`
  background: #ef4444;
  color: #fff;
  border-radius: 9px;
  padding: 1px 6px;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
`

const PanelActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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

const CloseBtn = styled.button`
  font-size: 1.6rem;
  line-height: 1;
  color: #94a3b8;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: #64748b;
  }
`

const List = styled.ul`
  max-height: 420px;
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
  background: ${({ $read, $bg }) => ($read ? '#fff' : $bg)};
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
`

const IconBox = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
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
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 3px;
`

const ItemMsg = styled.div`
  font-size: 1.2rem;
  color: #475569;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ItemMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
`

const ItemTime = styled.span`
  font-size: 1.1rem;
  color: #94a3b8;
  white-space: nowrap;
`

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
`

const Empty = styled.div`
  padding: 36px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 1.3rem;
`

const AlarmNotification = () => {
  const { t } = useTranslation('robot')
  const location = useLocation()
  const { session } = useUserStore()
  const userId = session?.userId
  const { state: isOpen, on: open, off: close } = useToggle()
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(() => getReadIds(userId))

  // 같은 브라우저에서 계정이 바뀌면(재로그인 등) 해당 계정의 읽음 기록으로 다시 로드
  useEffect(() => {
    setReadIds(getReadIds(userId))
  }, [userId])

  const wrapperRef = useRef(null)
  const listRef = useRef(null)
  const itemElsRef = useRef(new Map())
  const pendingSeenRef = useRef(new Set())

  useEffect(() => {
    let cancelled = false

    const fetchNotifications = async () => {
      try {
        const res = await deviceApis.getDeviceNotifications({ onlyActiveFault: true, size: '100' })
        const list = res?.content ?? res?.data?.content ?? []
        if (cancelled) return

        // id는 deviceId+occurredAt 조합(읽음 처리 단위). 동일 id를 가진 항목이 여러 개일 수 있으므로
        // 렌더링 key는 별도로 index를 더해 고유성을 보장한다.
        const withIds = list
          .map((item, index) => ({
            ...item,
            id: makeNotificationId(item.deviceId, item.occurredAt),
            renderKey: `${makeNotificationId(item.deviceId, item.occurredAt)}::${index}`
          }))
          .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        setNotifications(withIds)
      } catch (error) {
        console.error('[AlarmNotification] failed to fetch notifications:', error)
      }
    }

    fetchNotifications()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const commitPendingReads = useCallback(() => {
    if (pendingSeenRef.current.size === 0) return
    const current = getReadIds(userId)
    pendingSeenRef.current.forEach((id) => current.add(id))
    saveReadIds(userId, current)
    setReadIds(new Set(current))
    pendingSeenRef.current.clear()
  }, [userId])

  const handleClose = useCallback(() => {
    commitPendingReads()
    close()
  }, [commitPendingReads, close])

  useClickOutSide(wrapperRef, handleClose)

  // 패널이 열려 있는 동안 스크롤로 노출된 항목을 기록 (닫힐 때 일괄 읽음 처리)
  useEffect(() => {
    if (!isOpen) return
    const root = listRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.notificationId
            if (id) pendingSeenRef.current.add(id)
          }
        })
      },
      { root, threshold: SEEN_THRESHOLD }
    )

    itemElsRef.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isOpen, notifications])

  useEffect(() => {
    return () => {
      commitPendingReads()
    }
  }, [commitPendingReads])

  const setItemRef = useCallback(
    (id) => (el) => {
      if (el) itemElsRef.current.set(id, el)
      else itemElsRef.current.delete(id)
    },
    []
  )

  const handleTriggerClick = () => {
    if (isOpen) handleClose()
    else open()
  }

  const handleMarkAll = (e) => {
    e.stopPropagation()
    const current = getReadIds(userId)
    notifications.forEach((n) => current.add(n.id))
    saveReadIds(userId, current)
    setReadIds(new Set(current))
    pendingSeenRef.current.clear()
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  return (
    <Wrapper ref={wrapperRef}>
      <TriggerBtn type="button" onClick={handleTriggerClick} aria-label={t('alarmNotification.panelTitle')}>
        <i className="icon">
          <SvgNotification />
        </i>
        {unreadCount > 0 && <UnreadBadge>{unreadCount > 9 ? '9+' : unreadCount}</UnreadBadge>}
      </TriggerBtn>

      {isOpen && (
        <Panel>
          <PanelHeader>
            <PanelTitleGroup>
              <PanelTitle>{t('alarmNotification.panelTitle')}</PanelTitle>
              {unreadCount > 0 && <UnreadPill>{unreadCount}</UnreadPill>}
            </PanelTitleGroup>
            <PanelActions>
              {unreadCount > 0 && (
                <MarkAllBtn type="button" onClick={handleMarkAll}>
                  {t('alarmNotification.markAll')}
                </MarkAllBtn>
              )}
              <CloseBtn type="button" onClick={handleClose} aria-label={t('cancel')}>
                ×
              </CloseBtn>
            </PanelActions>
          </PanelHeader>

          <List ref={listRef}>
            {notifications.length === 0 ? (
              <Empty>{t('alarmNotification.empty')}</Empty>
            ) : (
              notifications.map((n) => {
                const conf = SOURCE_CONFIG[n.source] ?? DEFAULT_SOURCE_CONFIG
                const isRead = readIds.has(n.id)
                const { unit, count } = getRelativeTimeParts(n.occurredAt)
                const timeText =
                  unit === 'justNow' ? t('alarmNotification.timeJustNow') : t(`alarmNotification.${unit}`, { count })

                return (
                  <Item
                    key={n.renderKey}
                    ref={setItemRef(n.renderKey)}
                    data-notification-id={n.id}
                    $bg={conf.bg}
                    $read={isRead}
                  >
                    <IconBox $color={conf.color}>{conf.symbol}</IconBox>
                    <ItemBody>
                      <ItemTitle>{n.deviceName}</ItemTitle>
                      <ItemMsg title={n.message}>{n.title}</ItemMsg>
                    </ItemBody>
                    <ItemMeta>
                      <ItemTime>{timeText}</ItemTime>
                      {!isRead && <UnreadDot />}
                    </ItemMeta>
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

export default AlarmNotification
