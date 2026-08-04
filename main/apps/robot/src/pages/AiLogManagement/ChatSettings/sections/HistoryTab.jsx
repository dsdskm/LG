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
  PrimaryButton,
  ModalBackdrop,
  ModalCard,
  ModalTitle,
  ModalDescription,
  ModalActions,
} from '../styles'

import { formatDateTime } from '../chatSettings.utils'

const toDebugMeta = (item) => {
  const raw = item?.debugMeta
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

const formatScore = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

const toFiniteNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const summarizeLoginUser = (debugMeta, item) => {
  const loginUser = debugMeta?.loginUser && typeof debugMeta.loginUser === 'object'
    ? debugMeta.loginUser
    : {}

  const userId = String(loginUser?.userId ?? item?.author ?? '').trim()
  const userEmail = String(loginUser?.userEmail ?? '').trim()
  const accountId = String(loginUser?.accountId ?? '').trim()

  return {
    userId,
    userEmail,
    accountId,
  }
}

const resolveDisplayEmail = (loginUser, item) => {
  const email = String(loginUser?.userEmail ?? '').trim()
  if (email) return email
  return String(item?.author ?? '').trim() || '-'
}

const normalizeChunkKeys = (value) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

const summarizeDebugIntent = (intent, confidence) => {
  const labelMap = {
    info: '정보형 질문으로 판단',
    action: '실행형 요청으로 판단',
    data: '조회형 요청으로 판단',
  }
  const summary = labelMap[String(intent ?? '').trim().toLowerCase()] ?? '분류 정보 없음'
  const conf = Number.isFinite(confidence) ? confidence.toFixed(2) : '-'
  return `${summary} (신뢰도 ${conf})`
}

export const HistoryTab = ({ history, ragDocs = [], onRefresh, refreshing = false }) => {
  const [query, setQuery] = useState('')
  const [userEmailFilter, setUserEmailFilter] = useState('')
  const [intentFilter, setIntentFilter] = useState('all')
  const [appFilter, setAppFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [selectedChunkKey, setSelectedChunkKey] = useState('')

  const totalHistoryCount = Array.isArray(history) ? history.length : 0

  const appOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (history ?? [])
          .map((item) => String(item?.currentApp ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right))

    return ['all', ...values]
  }, [history])

  const actionOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (history ?? [])
          .map((item) => String(item?.chatAction ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right))

    return ['all', ...values]
  }, [history])

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedUserEmail = userEmailFilter.trim().toLowerCase()

    return (history ?? []).filter((item) => {
      const debugMeta = toDebugMeta(item)
      const loginUser = summarizeLoginUser(debugMeta, item)
      const displayEmail = resolveDisplayEmail(loginUser, item)
      const currentApp = String(item?.currentApp ?? '').trim()
      const chatAction = String(item?.chatAction ?? '').trim()
      const itemIntent = String(debugMeta?.pipelineIntent ?? '').trim().toLowerCase()

      if (appFilter !== 'all' && currentApp !== appFilter) return false
      if (actionFilter !== 'all' && chatAction !== actionFilter) return false
      if (intentFilter !== 'all' && itemIntent !== intentFilter) return false
      if (normalizedUserEmail && !displayEmail.toLowerCase().includes(normalizedUserEmail)) return false

      if (!normalizedQuery) return true

      const haystack = [
        item?.userMessage,
        item?.assistantText,
        item?.currentPath,
        item?.currentApp,
        item?.chatAction,
        item?.author,
        displayEmail,
        item?.conversationId,
        debugMeta?.pipelineIntent,
        debugMeta?.pipelineTrace,
        debugMeta?.usedCollection,
        ...(Array.isArray(debugMeta?.usedChunks) ? debugMeta.usedChunks : []),
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(normalizedQuery)
    })
  }, [history, query, userEmailFilter, intentFilter, appFilter, actionFilter])

  const ragDocByChunkKey = useMemo(() => {
    const map = new Map()
    for (const row of Array.isArray(ragDocs) ? ragDocs : []) {
      const chunkKey = String(row?.chunkKey ?? row?.id ?? '').trim()
      if (!chunkKey || map.has(chunkKey)) continue
      map.set(chunkKey, row)
    }
    return map
  }, [ragDocs])

  const selectedRagDoc = selectedChunkKey ? ragDocByChunkKey.get(selectedChunkKey) : undefined

  return (
    <SettingCard>
      <SectionTitleRow>
        <CardHeader>
          <CardTitle>최근 채팅 내역</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SmallBadge>{filteredHistory.length}/{totalHistoryCount}건</SmallBadge>
            <PrimaryButton
              type="button"
              onClick={() => onRefresh?.()}
              disabled={refreshing}
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
            >
              {refreshing ? '갱신 중...' : '리스트 갱신'}
            </PrimaryButton>
          </div>
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

        <input
          value={userEmailFilter}
          onChange={(e) => setUserEmailFilter(e.target.value)}
          placeholder="사용자 email 필터"
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
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
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
          <option value="all">인텐트 전체</option>
          <option value="info">info</option>
          <option value="action">action</option>
        </select>

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
          filteredHistory.map((item) => {
            const debugMeta = toDebugMeta(item)
            const intent = String(debugMeta?.pipelineIntent ?? '').trim()
            const trace = String(debugMeta?.pipelineTrace ?? '').trim()
            const confidence = Number(debugMeta?.pipelineConfidence)
            const usedCollection = String(debugMeta?.usedCollection ?? '').trim()
            const primaryChunkKey = String(debugMeta?.primaryChunkKey ?? '').trim()
            const usedChunks = Array.isArray(debugMeta?.usedChunks)
              ? debugMeta.usedChunks.map((value) => String(value ?? '').trim()).filter(Boolean)
              : []
            const effectivePrimaryChunkKey = primaryChunkKey || usedChunks[0] || ''
            const ragScores = Array.isArray(debugMeta?.ragScores)
              ? debugMeta.ragScores
              : []
            const ragMinScore = toFiniteNumber(debugMeta?.ragMinScore)
            const defaultLlmFallback = Boolean(debugMeta?.defaultLlmFallback)
            const loginUser = summarizeLoginUser(debugMeta, item)
            const displayEmail = resolveDisplayEmail(loginUser, item)

            return (
              <HistoryCard key={item.id}>
                <HistoryMeta>
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>{item.currentApp || '-'}</span>
                  <span>{item.currentPath || '-'}</span>
                  <span>{item.chatAction || '-'}</span>
                </HistoryMeta>

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    alignItems: 'start',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gap: '10px',
                      border: '1px solid #dbe3ef',
                      borderRadius: '10px',
                      background: '#ffffff',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <SmallBadge>대화</SmallBadge>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            maxWidth: '90%',
                            background: 'linear-gradient(135deg,#CD7B94,#BF2D59,#B91C4C)',
                            color: '#ffffff',
                            borderRadius: '16px 16px 4px 16px',
                            padding: '10px 13px',
                            fontSize: '13px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>{displayEmail}</div>
                          {item.userMessage || '-'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div
                          style={{
                            maxWidth: '90%',
                            background: '#f4f5f7',
                            color: '#262f44',
                            borderRadius: '16px 16px 16px 4px',
                            padding: '10px 13px',
                            fontSize: '13px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: '#adb5bd', marginBottom: '4px' }}>AI Assistant</div>
                          {item.assistantText || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: '8px',
                      border: '1px solid #dbe3ef',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      padding: '10px',
                    }}
                  >
                    <SmallBadge>디버그 정보</SmallBadge>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px 14px',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: '#334155',
                      }}
                    >
                      <div style={{ minWidth: '280px' }}>
                        <strong>의도 분류:</strong> {summarizeDebugIntent(intent, confidence)}
                      </div>

                      <div style={{ minWidth: '280px' }}>
                        <strong>사용자:</strong> {displayEmail}
                        {' | '}
                        <strong>userId:</strong> {loginUser.userId || '-'}
                        {' | '}
                        <strong>accountId:</strong> {loginUser.accountId || '-'}
                      </div>

                      <div style={{ minWidth: '280px' }}>
                        <strong>실제 선택된 RAG:</strong>
                        {' '}
                        {usedCollection || '-'}
                        {' / 실제 사용 chunk_key: '}
                        {effectivePrimaryChunkKey ? (
                          <button
                            type="button"
                            onClick={() => setSelectedChunkKey(effectivePrimaryChunkKey)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#1d4ed8',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                              fontSize: '12px',
                            }}
                          >
                            {effectivePrimaryChunkKey}
                          </button>
                        ) : '-'}
                      </div>

                      <div style={{ minWidth: '280px' }}>
                        <strong>응답 생성 흐름:</strong> {trace || '-'}
                      </div>
                    </div>

                    <div style={{ color: '#1d4ed8', fontSize: '12px', fontWeight: 700 }}>
                      RAG 점수 상세 ({ragScores.length}개)
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        fontSize: '12px',
                        color: '#475569',
                        background: '#eef2ff',
                        border: '1px solid #dbe3ef',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        lineHeight: 1.5,
                      }}
                    >
                      <div>
                        <strong>기준 점수(minScore):</strong>
                        {' '}
                        {ragMinScore !== undefined ? ragMinScore.toFixed(2) : '-'}
                        {' '}
                        (판정 기준: topScore)
                      </div>
                      <div>
                        <strong>최종 처리:</strong>
                        {' '}
                        {defaultLlmFallback ? 'RAG 미채택 → LLM 폴백' : 'RAG 채택'}
                      </div>
                      <div><strong>topScore</strong>: 검색 매칭 원점수</div>
                      <div><strong>adjustedScore</strong>: 우선순위 가중치(화면 보너스 등) 반영 점수</div>
                      <div><strong>hitCount</strong>: 해당 컬렉션에서 매칭된 청크 개수</div>
                      <div>
                        <strong>topChunks</strong>: 상위 매칭 chunk_key
                        {' '}
                        (최종 스코어 포함, 클릭하면 원문 RAG 팝업)
                      </div>
                    </div>
                    {ragScores.length > 0 ? (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {ragScores.map((row, index) => {
                          const collection = String(row?.collection ?? '').trim() || '-'
                          const topScoreNum = toFiniteNumber(row?.topScore)
                          const topScore = formatScore(row?.topScore)
                          const adjustedScore = formatScore(row?.adjustedScore)
                          const hitCount = Number.isFinite(Number(row?.hitCount)) ? Number(row?.hitCount) : 0
                          const topChunkIds = normalizeChunkKeys(row?.topChunkIds)
                          const topChunks = Array.isArray(row?.topChunks)
                            ? row.topChunks
                              .map((chunkRow) => ({
                                chunkKey: String(chunkRow?.chunkKey ?? '').trim(),
                                finalScore: formatScore(chunkRow?.finalScore),
                              }))
                              .filter((chunkRow) => Boolean(chunkRow.chunkKey))
                            : []
                          const chunkScoreEntries = topChunks.length > 0
                            ? topChunks
                            : topChunkIds.map((chunkKey) => ({ chunkKey, finalScore: '-' }))
                          const passesThreshold = ragMinScore !== undefined && topScoreNum !== undefined
                            ? topScoreNum >= ragMinScore
                            : undefined
                          const isSelected = Boolean(usedCollection) && collection === usedCollection && usedChunks.length > 0

                          let selectionReason = '판정 정보 없음'
                          if (passesThreshold === false) {
                            selectionReason = `미채택 (기준 ${ragMinScore?.toFixed(2)} 미만)`
                          } else if (passesThreshold === true && isSelected) {
                            selectionReason = '채택 (기준 통과 + 최종 선택)'
                          } else if (passesThreshold === true && !isSelected) {
                            selectionReason = '미채택 (기준 통과, 다른 컬렉션이 최종 선택)'
                          } else if (passesThreshold === undefined && isSelected) {
                            selectionReason = '채택 (최종 선택)'
                          }

                          return (
                            <div
                              key={`rag-score-${item.id}-${index}`}
                              style={{
                                border: '1px solid #dbe3ef',
                                borderRadius: '8px',
                                padding: '8px',
                                fontSize: '12px',
                                color: '#334155',
                                background: '#ffffff',
                                minWidth: '260px',
                                flex: '1 1 280px',
                              }}
                            >
                              <div>
                                <strong>collection:</strong> {collection}
                                {' | '}
                                <strong>topScore:</strong> {topScore}
                                {' | '}
                                <strong>adjustedScore:</strong> {adjustedScore}
                                {' | '}
                                <strong>hitCount:</strong> {hitCount}
                              </div>
                              <div>
                                <strong>채택 판정:</strong> {selectionReason}
                              </div>
                              <div>
                                <strong>chunk 최종 스코어:</strong>{' '}
                                {chunkScoreEntries.length > 0 ? chunkScoreEntries.map(({ chunkKey, finalScore }, chunkIndex) => (
                                  <button
                                    key={`score-chunk-${item.id}-${index}-${chunkKey}-${chunkIndex}`}
                                    type="button"
                                    onClick={() => setSelectedChunkKey(chunkKey)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#1d4ed8',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      padding: 0,
                                      fontSize: '12px',
                                      marginRight: '4px',
                                    }}
                                  >
                                    {chunkKey} ({finalScore})
                                  </button>
                                )) : '-'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <PageDescription style={{ marginTop: '6px' }}>저장된 RAG 점수 정보가 없습니다.</PageDescription>
                    )}
                  </div>
                </div>
              </HistoryCard>
            )
          })
        ) : (
          <PageDescription>검색/필터 조건에 맞는 채팅 내역이 없습니다.</PageDescription>
        )}
      </HistoryList>

      {selectedChunkKey ? (
        <ModalBackdrop onClick={() => setSelectedChunkKey('')}>
          <ModalCard style={{ width: 'min(760px, 100%)', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <ModalTitle>RAG 상세: {selectedChunkKey}</ModalTitle>
            <ModalDescription>
              선택한 chunk_key의 실제 문서 내용을 확인할 수 있습니다.
            </ModalDescription>

            <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>컬렉션(key):</strong> {String(selectedRagDoc?.key ?? '-').trim() || '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>제목(title):</strong> {String(selectedRagDoc?.title ?? '-').trim() || '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>키워드(keywords):</strong> {Array.isArray(selectedRagDoc?.keywords) ? selectedRagDoc.keywords.join(', ') : '-'}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                <strong>본문(body):</strong>
              </div>
              <HistoryMessage>
                {String(selectedRagDoc?.body ?? '').trim() || '해당 chunk_key에 매칭되는 RAG 문서를 찾지 못했습니다.'}
              </HistoryMessage>
            </div>

            <ModalActions>
              <PrimaryButton type="button" onClick={() => setSelectedChunkKey('')}>
                닫기
              </PrimaryButton>
            </ModalActions>
          </ModalCard>
        </ModalBackdrop>
      ) : null}
    </SettingCard>
  )
}
