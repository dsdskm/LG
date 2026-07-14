import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  getEventById,
  getAnalysisByEventId,
  getAssignees,
  runAction,
  updateAnalysisByEventId,
} from '@/apis/ai/aiApis'
import { convertDateToString } from '@repo/utils'
import { severityLabelMap, statusLabelMap } from '../constants'
import {
  PanelRoot,
  PanelHeader,
  PanelTitleRow,
  PanelTitle,
  PanelBadge,
  PanelCloseButton,
  PanelBody,
  Section,
  SectionTitleRow,
  SectionTitle,
  SectionBody,
  InfoTable,
  InfoRow,
  InfoKey,
  InfoValue,
  InfoValueBetween,
  InfoValueCenter,
  AnalysisBox,
  AssigneeList,
  AssigneeCard,
  AssigneeIdentityRow,
  AssigneeName,
  AssigneeMeta,
  AssigneeMetaLine,
  Avatar,
  AvatarImage,
  SuggestedActionList,
  SuggestedActionItem,
  SuggestedActionName,
  SuggestedActionReason,
  ActionConfirmOverlay,
  ActionConfirmCard,
  ActionConfirmText,
  ActionConfirmActions,
  ActionConfirmButton,
  ActionConfirmPrimaryButton,
  MutedText,
  HeaderActions,
  HeaderActionButton,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  LoadingBox,
  ErrorBox,
  LogButton,
  LogModalOverlay,
  LogModal,
  LogModalHeader,
  LogModalTitle,
  LogModalCloseButton,
  LogModalBody,
  LogBundle,
  LogBundleHeader,
  LogLegend,
  LogLegendItem,
  LogLineRow,
  LogIndex,
  LogLevel,
  LogMessage,
  EmptyLogText
} from './styles'

const normalizeResponse = (response) => response?.data ?? response ?? null

const isLikelyImageSource = (value) => {
  const profile = String(value ?? '').trim()
  if (!profile) return false

  return /^(https?:\/\/|data:image\/|\/|\.\/|\.\.\/)/i.test(profile) || /\.(png|jpe?g|gif|webp|svg)$/i.test(profile)
}

const toInitial = (name) => {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

const statusStyleMap = {
  received: {
    backgroundColor: '#edf1f5',
    color: '#5f6b7c',
    borderColor: '#d9e2ec'
  },
  prepared: {
    backgroundColor: '#edf1f5',
    color: '#5f6b7c',
    borderColor: '#d9e2ec'
  },
  prepare_failed: {
    backgroundColor: '#fff3e5',
    color: '#e67e22',
    borderColor: '#ffd8b5'
  },
  analyze_failed: {
    backgroundColor: '#fff3e5',
    color: '#e67e22',
    borderColor: '#ffd8b5'
  },
  failed: {
    backgroundColor: '#ffe8e8',
    color: '#d93025',
    borderColor: '#ffc9c9'
  },
  analyzing: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32',
    borderColor: '#cbeed6'
  },
  analyzed: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32',
    borderColor: '#cbeed6'
  },
  completed: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32',
    borderColor: '#cbeed6'
  }
}

const severityStyleMap = {
  critical: {
    backgroundColor: '#ffe8e8',
    color: '#d93025',
    borderColor: '#ffc9c9'
  },
  high: {
    backgroundColor: '#ffe8e8',
    color: '#d93025',
    borderColor: '#ffc9c9'
  },
  medium: {
    backgroundColor: '#fff3e5',
    color: '#e67e22',
    borderColor: '#ffd8b5'
  },
  low: {
    backgroundColor: '#fff3e5',
    color: '#e67e22',
    borderColor: '#ffd8b5'
  }
}

const defaultBadgeStyle = {
  backgroundColor: '#edf1f5',
  color: '#5f6b7c',
  borderColor: '#d9e2ec'
}

const getStatusBadgeStyle = (event, analysis) => {
  const value = event?.status ?? event?.actionStatus ?? analysis?.status ?? ''

  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
  return statusStyleMap[normalizedValue] || defaultBadgeStyle
}

const getSeverityBadgeStyle = (event, analysis) => {
  const value = event?.severity ?? event?.level ?? analysis?.severity ?? analysis?.level ?? ''

  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
  return severityStyleMap[normalizedValue] || defaultBadgeStyle
}

const getSeverityLabel = (event, analysis) => {
  const value = event?.severity ?? event?.level ?? analysis?.severity ?? analysis?.level ?? ''

  if (!value) return '-'

  const normalizedValue = String(value).trim().toLowerCase()
  return severityLabelMap[normalizedValue] || String(value)
}

const getStatusLabel = (event, analysis) => {
  const value = event?.status ?? event?.actionStatus ?? analysis?.status ?? ''

  if (!value) return '-'

  const normalizedValue = String(value).trim().toLowerCase()
  return statusLabelMap[normalizedValue] || String(value)
}

const getFunctionLabel = (event, analysis) => {
  const value = event?.func ?? event?.function ?? analysis?.func ?? analysis?.function ?? ''

  if (!value) return '-'
  return String(value)
}

const getFunctionKey = (event, analysis) => {
  const value = event?.func ?? event?.function ?? analysis?.func ?? analysis?.function ?? ''

  return String(value ?? '').trim()
}

const getOccurredAt = (event) => {
  return event?.occurredAt ?? event?.createdAt ?? event?.timestamp ?? '-'
}

const getRobotId = (event) => {
  return event?.robotId ?? event?.robot?.id ?? '-'
}

const getSummary = (event, analysis) => {
  const value = analysis?.summary ?? event?.summary ?? event?.message ?? ''

  if (!value) return '요약 정보가 없습니다.'
  return String(value)
}

const getReason = (event, analysis) => {
  const value = analysis?.reason ?? event?.reason ?? ''

  if (!value) return '원인 정보가 없습니다.'
  return String(value)
}

const getAssignee = (event, analysis, apiAssignees = []) => {
  if (Array.isArray(apiAssignees) && apiAssignees.length > 0) {
    return apiAssignees.join(', ')
  }

  const value = analysis?.assignee ?? analysis?.owner ?? analysis?.manager ?? event?.assignee ?? event?.owner ?? ''

  return String(value)
}

const getAssigneesFromConfig = (payload, functionKey = '') => {
  const base = Array.isArray(payload) ? payload : []
  const normalizedFunctionKey = String(functionKey ?? '')
    .trim()
    .toLowerCase()

  const filtered = normalizedFunctionKey
    ? base.filter(
        (item) =>
          String(item?.func ?? '')
            .trim()
            .toLowerCase() === normalizedFunctionKey
      )
    : base

  const names = filtered.map((item) => String(item?.name ?? item?.email ?? '').trim()).filter(Boolean)

  return [...new Set(names)]
}

const getAssigneeProfilesFromConfig = (payload, functionKey = '') => {
  const base = Array.isArray(payload) ? payload : []
  const normalizedFunctionKey = String(functionKey ?? '')
    .trim()
    .toLowerCase()

  const filtered = normalizedFunctionKey
    ? base.filter(
        (item) =>
          String(item?.func ?? '')
            .trim()
            .toLowerCase() === normalizedFunctionKey
      )
    : base

  return filtered
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const name = String(item.name ?? item.email ?? '').trim()
      const email = String(item.email ?? '').trim()
      const team = String(item.team ?? '').trim()
      const profile = String(item.profile ?? item.job ?? '').trim()
      const key = String(item.id ?? email ?? `${name}-${index + 1}`)

      return {
        key,
        name: name || '-',
        email: email || '-',
        team: team || '-',
        profile: profile || '프로필 정보 없음'
      }
    })
    .filter(Boolean)
}

const getSolution = (event, analysis) => {
  const value =
    analysis?.solution ?? analysis?.solutions ?? analysis?.resolution ?? analysis?.recovery ?? event?.solution ?? ''

  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean)
    return filtered.length > 0 ? filtered.join('\n') : '솔루션 정보가 없습니다.'
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return '솔루션 정보가 없습니다.'
}

const getRawErrorLogBundle = (event, analysis) => {
  return event?.errorLogBundle ?? analysis?.errorLogBundle ?? event?.errorLog ?? analysis?.errorLog ?? null
}

// errorLogBundle 이 비어 있을 때(준비/분석 실패 등) 원문 fullLog 를 단일 번들로 변환해 로그 보기에 노출한다.
const fullLogToBundle = (fullLog) => {
  if (!Array.isArray(fullLog) || fullLog.length === 0) return []

  const errorLine = fullLog.find((line) => String(line?.level ?? '').toUpperCase() === 'ERROR')
  return [{ errorIndex: errorLine?.index ?? null, context: fullLog }]
}

const getParsedErrorLogBundle = (value) => {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)

      if (Array.isArray(parsed)) {
        return parsed
      }

      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.context)) {
          return [parsed]
        }
      }

      return []
    } catch {
      return [
        {
          context: [
            {
              index: '-',
              level: 'INFO',
              message: value
            }
          ],
          errorIndex: null
        }
      ]
    }
  }

  if (value && typeof value === 'object') {
    if (Array.isArray(value.context)) {
      return [value]
    }

    return []
  }

  return []
}

const EventDetailPanel = ({ eventId, open, onClose, onActionExecuted }) => {
  const [event, setEvent] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [apiAssignees, setApiAssignees] = useState([])
  const [funcAssigneeProfiles, setFuncAssigneeProfiles] = useState([])
  const [pendingAction, setPendingAction] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => {
    if (!open || !eventId) {
      setEvent(null)
      setAnalysis(null)
      setApiAssignees([])
      setFuncAssigneeProfiles([])
      setPendingAction(null)
      setErrorMessage('')
      setIsLoading(false)
      setIsLogModalOpen(false)
      setIsEditing(false)
      setEditForm(null)
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [eventResponse, analysisResponse, assigneesResponse] = await Promise.allSettled([
          getEventById(eventId),
          getAnalysisByEventId(eventId),
          getAssignees()
        ])

        if (!isMounted) return

        const nextEvent = eventResponse.status === 'fulfilled' ? normalizeResponse(eventResponse.value) : null

        const nextAnalysis = analysisResponse.status === 'fulfilled' ? normalizeResponse(analysisResponse.value) : null

        const nextAssignees = assigneesResponse.status === 'fulfilled' ? normalizeResponse(assigneesResponse.value) : []

        const functionKey = getFunctionKey(nextEvent, nextAnalysis)
        const filteredAssignees = getAssigneesFromConfig(nextAssignees, functionKey)
        const nextFuncAssigneeProfiles = getAssigneeProfilesFromConfig(nextAssignees, functionKey)

        setEvent(nextEvent)
        setAnalysis(nextAnalysis)
        setApiAssignees(filteredAssignees)
        setFuncAssigneeProfiles(nextFuncAssigneeProfiles)

        if (!nextEvent && !nextAnalysis) {
          setErrorMessage('상세 데이터를 불러오지 못했습니다.')
        }
      } catch {
        if (!isMounted) return
        setEvent(null)
        setAnalysis(null)
        setApiAssignees([])
        setFuncAssigneeProfiles([])
        setErrorMessage('상세 데이터를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [eventId, open])

  const severityLabel = useMemo(() => getSeverityLabel(event, analysis), [event, analysis])
  const statusLabel = useMemo(() => getStatusLabel(event, analysis), [event, analysis])
  const severityBadgeStyle = useMemo(() => getSeverityBadgeStyle(event, analysis), [event, analysis])
  const statusBadgeStyle = useMemo(() => getStatusBadgeStyle(event, analysis), [event, analysis])
  const functionLabel = useMemo(() => getFunctionLabel(event, analysis), [event, analysis])
  const classificationScore = useMemo(() => {
    return typeof analysis?.confidence === 'number' ? analysis.confidence.toFixed(2) : '-'
  }, [analysis])
  const occurredAt = useMemo(() => convertDateToString(getOccurredAt(event)), [event])
  const robotId = useMemo(() => getRobotId(event), [event])
  const rawErrorLogBundle = useMemo(() => getRawErrorLogBundle(event, analysis), [event, analysis])
  const parsedErrorLogBundle = useMemo(() => {
    const fromBundle = getParsedErrorLogBundle(rawErrorLogBundle)
    if (fromBundle.length > 0) return fromBundle
    return fullLogToBundle(event?.fullLog ?? analysis?.fullLog)
  }, [rawErrorLogBundle, event, analysis])

  // 전체 로그(원문) — index 오름차순
  const fullLogLines = useMemo(() => {
    const lines = event?.fullLog ?? analysis?.fullLog
    if (!Array.isArray(lines) || lines.length === 0) return []
    return [...lines].sort((a, b) => Number(a?.index ?? 0) - Number(b?.index ?? 0))
  }, [event, analysis])

  // 분석에 사용된 라인 index 집합 + 에러 라인 index 집합 (errorLogBundle 기준)
  const analyzedIndexSet = useMemo(() => {
    const set = new Set()
    parsedErrorLogBundle.forEach((bundle) => {
      ;(bundle?.context || []).forEach((log) => {
        if (log?.index !== undefined && log?.index !== null) set.add(log.index)
      })
    })
    return set
  }, [parsedErrorLogBundle])

  const errorIndexSet = useMemo(() => {
    const set = new Set()
    parsedErrorLogBundle.forEach((bundle) => {
      if (bundle?.errorIndex !== undefined && bundle?.errorIndex !== null) set.add(bundle.errorIndex)
    })
    return set
  }, [parsedErrorLogBundle])
  const summary = useMemo(() => getSummary(event, analysis), [event, analysis])
  const reason = useMemo(() => getReason(event, analysis), [event, analysis])
  const assignee = useMemo(() => getAssignee(event, analysis, apiAssignees), [event, analysis, apiAssignees])
  const solution = useMemo(() => getSolution(event, analysis), [event, analysis])
  // 후속 액션 제안: event_analyzer가 저장한 analysis.actions ([{ key, name, reason }])
  const suggestedActions = useMemo(() => {
    const raw = Array.isArray(analysis?.actions) ? analysis.actions : []
    return raw
      .map((item, index) => {
        const name = String(item?.name ?? item?.key ?? '').trim()
        if (!name) return null
        return {
          key: String(item?.key ?? `${eventId}-${index}`),
          name,
          reason: String(item?.reason ?? '').trim()
        }
      })
      .filter(Boolean)
  }, [analysis, eventId])

  // 편집 시드: 표시용 placeholder 가 아닌 원본 값
  const editSeed = useMemo(
    () => ({
      severity: String(event?.severity ?? analysis?.severity ?? event?.level ?? analysis?.level ?? '')
        .trim()
        .toLowerCase(),
      func: String(event?.func ?? analysis?.func ?? event?.function ?? analysis?.function ?? '').trim(),
      confidence: typeof analysis?.confidence === 'number' ? String(analysis.confidence) : '',
      summary: String(analysis?.summary ?? event?.summary ?? ''),
      reason: String(analysis?.reason ?? event?.reason ?? ''),
      solutions: String(analysis?.solution ?? analysis?.solutions ?? ''),
    }),
    [event, analysis],
  )

  const startEdit = useCallback(() => {
    setEditForm(editSeed)
    setIsEditing(true)
  }, [editSeed])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditForm(null)
  }, [])

  const changeField = useCallback((key, value) => {
    setEditForm((prev) => ({ ...(prev ?? {}), [key]: value }))
  }, [])

  const saveEdit = useCallback(async () => {
    if (!eventId || !editForm || isSaving) return
    setIsSaving(true)
    try {
      const payload = {
        summary: editForm.summary ?? '',
        reason: editForm.reason ?? '',
        solutions: editForm.solutions ?? '',
        func: String(editForm.func ?? '').trim(),
        severity: String(editForm.severity ?? '').trim(),
      }
      const confNum = Number(editForm.confidence)
      if (String(editForm.confidence ?? '').trim() !== '' && Number.isFinite(confNum)) {
        payload.confidence = confNum
      }

      await updateAnalysisByEventId(eventId, payload)

      // 로컬 상태 반영(재조회 없이 즉시 표시)
      setAnalysis((prev) => ({
        ...(prev ?? {}),
        summary: payload.summary,
        reason: payload.reason,
        solutions: payload.solutions,
        func: payload.func,
        severity: payload.severity,
        ...(payload.confidence !== undefined ? { confidence: payload.confidence } : {}),
      }))

      setIsEditing(false)
      setEditForm(null)
      onActionExecuted?.()
    } catch (e) {
      console.error('Failed to update analysis:', e)
    } finally {
      setIsSaving(false)
    }
  }, [eventId, editForm, isSaving, onActionExecuted])

  const handleConfirmRun = useCallback(async () => {
    if (!pendingAction || isRunning || !eventId) return
    setIsRunning(true)
    try {
      await runAction({ eventId, key: pendingAction.key })
      setPendingAction(null)
      onActionExecuted?.()
      onClose?.()
    } catch (error) {
      console.error('Failed to run action:', error)
    } finally {
      setIsRunning(false)
    }
  }, [pendingAction, isRunning, eventId, onActionExecuted, onClose])

  return (
    <>
      <PanelRoot>
        <PanelHeader>
          <PanelTitleRow>
            <PanelTitle>{eventId ? `Event #${eventId}` : 'Event Detail'}</PanelTitle>
            <PanelBadge style={severityBadgeStyle}>{severityLabel}</PanelBadge>
          </PanelTitleRow>

          <HeaderActions>
            {!isLoading && !errorMessage ? (
              isEditing ? (
                <>
                  <HeaderActionButton type="button" onClick={cancelEdit} disabled={isSaving}>
                    취소
                  </HeaderActionButton>
                  <HeaderActionButton type="button" $primary onClick={saveEdit} disabled={isSaving}>
                    {isSaving ? '저장 중...' : '저장'}
                  </HeaderActionButton>
                </>
              ) : (
                <HeaderActionButton type="button" onClick={startEdit}>
                  수정
                </HeaderActionButton>
              )
            ) : null}

            <PanelCloseButton type="button" onClick={onClose}>
              ✕
            </PanelCloseButton>
          </HeaderActions>
        </PanelHeader>

        <PanelBody>
          {isLoading ? <LoadingBox>상세 정보를 불러오는 중...</LoadingBox> : null}

          {!isLoading && errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

          {!isLoading && !errorMessage ? (
            <>
              <Section>
                <SectionTitleRow>
                  <SectionTitle>이벤트 정보</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  <InfoTable>
                    <InfoRow>
                      <InfoKey>Robot ID</InfoKey>
                      <InfoValue>{robotId}</InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoKey>Function</InfoKey>
                      <InfoValue>
                        {isEditing ? (
                          <FieldInput
                            value={editForm?.func ?? ''}
                            placeholder="예: 주행 / UNKNOWN"
                            onChange={(e) => changeField('func', e.target.value)}
                          />
                        ) : (
                          functionLabel
                        )}
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoKey>분류 점수</InfoKey>
                      <InfoValue>
                        {isEditing ? (
                          <FieldInput
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={editForm?.confidence ?? ''}
                            placeholder="0.00 ~ 1.00"
                            onChange={(e) => changeField('confidence', e.target.value)}
                          />
                        ) : (
                          classificationScore
                        )}
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoKey>상태</InfoKey>
                      <InfoValue>
                        <PanelBadge as="span" style={statusBadgeStyle}>
                          {statusLabel}
                        </PanelBadge>
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoKey>심각도</InfoKey>
                      <InfoValue>
                        {isEditing ? (
                          <FieldSelect
                            value={editForm?.severity ?? ''}
                            onChange={(e) => changeField('severity', e.target.value)}
                          >
                            <option value="">(없음)</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </FieldSelect>
                        ) : (
                          <PanelBadge as="span" style={severityBadgeStyle}>
                            {severityLabel}
                          </PanelBadge>
                        )}
                      </InfoValue>
                    </InfoRow>

                    <InfoRow>
                      <InfoKey>로그</InfoKey>
                      <InfoValueBetween>
                        <span>{parsedErrorLogBundle.length > 0 ? '오류 로그 있음' : '오류 로그 없음'}</span>

                        <LogButton
                          type="button"
                          $disabled={parsedErrorLogBundle.length === 0}
                          onClick={() => {
                            if (parsedErrorLogBundle.length === 0) return
                            setIsLogModalOpen(true)
                          }}
                          disabled={parsedErrorLogBundle.length === 0}
                        >
                          로그 보기
                        </LogButton>
                      </InfoValueBetween>
                    </InfoRow>

                    <InfoRow $last>
                      <InfoKey>발생 일시</InfoKey>
                      <InfoValue>{occurredAt}</InfoValue>
                    </InfoRow>
                  </InfoTable>
                </SectionBody>
              </Section>

              <Section>
                <SectionTitleRow>
                  <SectionTitle>요약</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  {isEditing ? (
                    <FieldTextarea
                      value={editForm?.summary ?? ''}
                      placeholder="요약"
                      onChange={(e) => changeField('summary', e.target.value)}
                    />
                  ) : (
                    <AnalysisBox>{summary}</AnalysisBox>
                  )}
                </SectionBody>
              </Section>

              <Section>
                <SectionTitleRow>
                  <SectionTitle>원인</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  {isEditing ? (
                    <FieldTextarea
                      value={editForm?.reason ?? ''}
                      placeholder="원인"
                      onChange={(e) => changeField('reason', e.target.value)}
                    />
                  ) : (
                    <AnalysisBox>{reason}</AnalysisBox>
                  )}
                </SectionBody>
              </Section>

              <Section>
                <SectionTitleRow>
                  <SectionTitle>제안 솔루션</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  {isEditing ? (
                    <FieldTextarea
                      value={editForm?.solutions ?? ''}
                      placeholder="제안 솔루션"
                      onChange={(e) => changeField('solutions', e.target.value)}
                    />
                  ) : (
                    <AnalysisBox>{solution}</AnalysisBox>
                  )}
                </SectionBody>
              </Section>

              <Section>
                <SectionTitleRow>
                  <SectionTitle>후속 액션 제안</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  {suggestedActions.length > 0 ? (
                    <SuggestedActionList>
                      {suggestedActions.map((item) => (
                        <SuggestedActionItem
                          key={item.key}
                          type="button"
                          title={item.reason || item.name}
                          onClick={() => setPendingAction({ key: item.key, name: item.name })}
                        >
                          <SuggestedActionName>{item.name}</SuggestedActionName>
                          {item.reason ? <SuggestedActionReason>{item.reason}</SuggestedActionReason> : null}
                        </SuggestedActionItem>
                      ))}
                    </SuggestedActionList>
                  ) : (
                    <AnalysisBox>
                      <MutedText>제안된 후속 액션이 없습니다.</MutedText>
                    </AnalysisBox>
                  )}
                </SectionBody>
              </Section>

              <Section>
                <SectionTitleRow>
                  <SectionTitle>담당자</SectionTitle>
                </SectionTitleRow>

                <SectionBody>
                  {funcAssigneeProfiles.length > 0 ? (
                    <AssigneeList>
                      {funcAssigneeProfiles.map((assigneeItem) => (
                        <AssigneeCard key={assigneeItem.key}>
                          <AssigneeIdentityRow>
                            <Avatar>
                              {isLikelyImageSource(assigneeItem.profile) ? (
                                <AvatarImage
                                  src={assigneeItem.profile}
                                  alt={`${assigneeItem.name || 'assignee'} profile`}
                                />
                              ) : (
                                toInitial(assigneeItem.name)
                              )}
                            </Avatar>

                            <AssigneeMeta>
                              <AssigneeName>{assigneeItem.name}</AssigneeName>
                              <AssigneeMetaLine>{assigneeItem.team}</AssigneeMetaLine>
                            </AssigneeMeta>
                          </AssigneeIdentityRow>
                        </AssigneeCard>
                      ))}
                    </AssigneeList>
                  ) : (
                    <AnalysisBox>{assignee ? assignee : <MutedText>담당자 정보가 없습니다.</MutedText>}</AnalysisBox>
                  )}
                </SectionBody>
              </Section>
            </>
          ) : null}
        </PanelBody>
      </PanelRoot>

      {isLogModalOpen ? createPortal(
        <LogModalOverlay onClick={() => setIsLogModalOpen(false)}>
          <LogModal onClick={(e) => e.stopPropagation()}>
            <LogModalHeader>
              <LogModalTitle>로그</LogModalTitle>
              <LogModalCloseButton type="button" onClick={() => setIsLogModalOpen(false)}>
                ✕
              </LogModalCloseButton>
            </LogModalHeader>

            <LogModalBody>
              {fullLogLines.length > 0 ? (
                // 전체 로그를 모두 보여주고, 분석에 사용된 구간(파랑)/에러 라인(빨강)만 강조한다.
                <LogBundle>
                  <LogBundleHeader>전체 로그 ({fullLogLines.length}줄)</LogBundleHeader>
                  <LogLegend>
                    <LogLegendItem $kind="analyzed">분석 사용 구간</LogLegendItem>
                    <LogLegendItem $kind="error">에러 라인</LogLegendItem>
                    <LogLegendItem $kind="other">미사용</LogLegendItem>
                  </LogLegend>

                  {fullLogLines.map((log) => {
                    const isErrorLine = errorIndexSet.has(log?.index)
                    const isAnalyzed = analyzedIndexSet.has(log?.index)

                    return (
                      <LogLineRow
                        key={`full-${log?.index}-${log?.message}`}
                        $error={isErrorLine}
                        $analyzed={isAnalyzed}
                      >
                        <LogIndex $error={isErrorLine}>#{log?.index ?? '-'}</LogIndex>

                        <LogLevel $level={log?.level} $error={isErrorLine}>
                          {log?.level ?? '-'}
                        </LogLevel>

                        <LogMessage>{log?.message ?? '-'}</LogMessage>
                      </LogLineRow>
                    )
                  })}
                </LogBundle>
              ) : parsedErrorLogBundle.length > 0 ? (
                // fullLog 가 없을 때(과거 데이터 등) 기존 방식: 분석 구간만 표시
                parsedErrorLogBundle.map((bundle, bundleIndex) => (
                  <LogBundle key={`bundle-${bundleIndex}`}>
                    <LogBundleHeader>Error Context #{bundleIndex + 1}</LogBundleHeader>

                    {(bundle?.context || []).map((log) => {
                      const isErrorLine = log?.index === bundle?.errorIndex

                      return (
                        <LogLineRow
                          key={`${bundleIndex}-${log?.index}-${log?.message}`}
                          $error={isErrorLine}
                          $analyzed={!isErrorLine}
                        >
                          <LogIndex $error={isErrorLine}>#{log?.index ?? '-'}</LogIndex>

                          <LogLevel $level={log?.level} $error={isErrorLine}>
                            {log?.level ?? '-'}
                          </LogLevel>

                          <LogMessage>{log?.message ?? '-'}</LogMessage>
                        </LogLineRow>
                      )
                    })}
                  </LogBundle>
                ))
              ) : (
                <EmptyLogText>표시할 로그가 없습니다.</EmptyLogText>
              )}
            </LogModalBody>
          </LogModal>
        </LogModalOverlay>,
        document.body,
      ) : null}

      {pendingAction ? (
        <ActionConfirmOverlay onClick={() => !isRunning && setPendingAction(null)}>
          <ActionConfirmCard onClick={(e) => e.stopPropagation()}>
            <ActionConfirmText>{pendingAction.name} 실행하시겠습니까?</ActionConfirmText>

            <ActionConfirmActions>
              <ActionConfirmButton type="button" disabled={isRunning} onClick={() => setPendingAction(null)}>
                취소
              </ActionConfirmButton>
              <ActionConfirmPrimaryButton type="button" disabled={isRunning} onClick={handleConfirmRun}>
                {isRunning ? '실행 중…' : '확인'}
              </ActionConfirmPrimaryButton>
            </ActionConfirmActions>
          </ActionConfirmCard>
        </ActionConfirmOverlay>
      ) : null}
    </>
  )
}

export default EventDetailPanel
