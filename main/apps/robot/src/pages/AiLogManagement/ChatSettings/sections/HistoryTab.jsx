import { useMemo, useState } from 'react'

import {
  SettingCard,
  CardHeader,
  CardTitle,
  SectionTitleRow,
  SmallBadge,
  PageDescription,
  HistoryList,
  HistoryCard,
  HistoryMeta,
  HistoryMessage,
} from '../styles'

import { formatDateTime } from '../chatSettings.utils'

export const HistoryTab = ({ history }) => {
  const [query, setQuery] = useState('')
  const [appFilter, setAppFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const appOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (history ?? [])
          .map((item) => String(item?.currentApp ?? '').trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))

    return ['all', ...values]
  }, [history])

  const actionOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (history ?? [])
          .map((item) => String(item?.chatAction ?? '').trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))

    return ['all', ...values]
  }, [history])

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return (history ?? []).filter((item) => {
      const currentApp = String(item?.currentApp ?? '').trim()
      const chatAction = String(item?.chatAction ?? '').trim()

      if (appFilter !== 'all' && currentApp !== appFilter) return false
      if (actionFilter !== 'all' && chatAction !== actionFilter) return false

      if (!normalizedQuery) return true

      const haystack = [
        item?.userMessage,
        item?.assistantText,
        item?.currentPath,
        item?.currentApp,
        item?.chatAction,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(normalizedQuery)
    })
  }, [history, query, appFilter, actionFilter])

  return (
    <SettingCard>
      <SectionTitleRow>
        <CardHeader>
          <CardTitle>최근 채팅 내역</CardTitle>
          <SmallBadge>{filteredHistory.length}/{history.length}건</SmallBadge>
        </CardHeader>
      </SectionTitleRow>

      <PageDescription>AI Assistant 패널에서 주고받은 최근 대화를 확인할 수 있습니다.</PageDescription>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          marginTop: '10px',
          marginBottom: '14px',
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="메시지/경로/액션 검색"
          style={{
            height: '40px',
            border: '1px solid #dbe3ef',
            borderRadius: '10px',
            padding: '0 12px',
            fontSize: '13px',
            color: '#334155',
            background: '#fff',
          }}
        />

        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          style={{
            height: '40px',
            border: '1px solid #dbe3ef',
            borderRadius: '10px',
            padding: '0 10px',
            fontSize: '13px',
            color: '#334155',
            background: '#fff',
          }}
        >
          {appOptions.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? '앱 전체' : value}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            height: '40px',
            border: '1px solid #dbe3ef',
            borderRadius: '10px',
            padding: '0 10px',
            fontSize: '13px',
            color: '#334155',
            background: '#fff',
          }}
        >
          {actionOptions.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? '액션 전체' : value}
            </option>
          ))}
        </select>
      </div>

      <HistoryList>
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <HistoryCard key={item.id}>
              <HistoryMeta>
                <span>{formatDateTime(item.createdAt)}</span>
                <span>{item.currentApp || '-'}</span>
                <span>{item.currentPath || '-'}</span>
                <span>{item.chatAction || '-'}</span>
              </HistoryMeta>

              <div style={{ display: 'grid', gap: '8px' }}>
                <SmallBadge>사용자</SmallBadge>
                <HistoryMessage>{item.userMessage || '-'}</HistoryMessage>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <SmallBadge>어시스턴트</SmallBadge>
                <HistoryMessage>{item.assistantText || '-'}</HistoryMessage>
              </div>
            </HistoryCard>
          ))
        ) : (
          <PageDescription>검색/필터 조건에 맞는 채팅 내역이 없습니다.</PageDescription>
        )}
      </HistoryList>
    </SettingCard>
  )
}