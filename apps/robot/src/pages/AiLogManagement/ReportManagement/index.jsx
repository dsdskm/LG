import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReportConfig, updateReportConfig } from '@/apis/ai/aiApis'

import {
  PageRoot,
  LoadingBox,
  ErrorBox,
  PreviewPanel,
  PreviewPanelHeader,
  PreviewPanelTitle,
  SplitGrid,
  EditorPane,
  PaneTitle,
  TemplateInput,
  TemplateTextarea,
  EditorActions,
  SaveButton,
  SecondaryButton,
  PreviewSubjectCard,
  PreviewPane,
  PreviewHtmlFrame,
  EmptyPreview
} from './styles'
import ReportManagementHeader from './components/ReportManagementHeader'

const PREVIEW_TOKEN_KEYS = [
  'eventId',
  'robotId',
  'status',
  'summary',
  'reason',
  'solutions',
  'func',
  'funcKey',
  'severity',
  'service',
  'provider',
  'createdAt',
  'updatedAt',
  'actions'
]

const formatSampleDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`
}

const buildSamplePayload = () => {
  const now = formatSampleDate(new Date())

  return {
    eventId: 101,
    robotId: 'robot-a17',
    status: 'analyzed',
    summary: '네비 에러 이슈',
    reason: '하드웨어 상태값이 장시간 정상 범위를 벗어나 누적되어 센서 보정 및 장치 점검이 필요한 상태입니다.',
    solutions: '설정값 재검증 후 예외 발생 구간에 대한 방어 로직을 추가하고 센서 캘리브레이션을 순차적으로 진행하세요.',
    func: '네비',
    funcKey: '네비',
    severity: 'high',
    service: 'azure',
    provider: 'azure',
    createdAt: now,
    updatedAt: now,
    actions: '- 센서 캘리브레이션 실행: 누적 오차 보정\n- 장치 점검 예약: 하드웨어 상태 정밀 진단'
  }
}

const normalizePreviewTemplate = (template) => {
  const source = String(template ?? '')

  // Keep label-token mapping stable for preview:
  // 기능 -> {func}, 이슈 summary -> {summary}, 이슈 원인 -> {reason}
  return source
    .replace(/(기능[^{}]*?)\{\s*(summary|reason|solutions)\s*\}/gi, '$1{func}')
    .replace(/(이슈\s*(?:요약|summary)[^{}]*?)\{\s*(reason|func|funcKey)\s*\}/gi, '$1{summary}')
    .replace(/(이슈\s*원인[^{}]*?)\{\s*(summary|func|funcKey)\s*\}/gi, '$1{reason}')
}

const applyTemplate = (template, payload) => {
  const source = normalizePreviewTemplate(template)

  return PREVIEW_TOKEN_KEYS.reduce((acc, key) => {
    const token = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g')
    return acc.replace(token, String(payload?.[key] ?? ''))
  }, source)
}

const ReportManagement = () => {
  const [template, setTemplate] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [subjectTemplateValue, setSubjectTemplateValue] = useState('')
  const [htmlTemplateValue, setHtmlTemplateValue] = useState('')
  const previewSample = useMemo(() => buildSamplePayload(), [])

  const previewSubject = useMemo(
    () => applyTemplate(subjectTemplateValue, previewSample),
    [previewSample, subjectTemplateValue]
  )

  const previewHtml = useMemo(() => applyTemplate(htmlTemplateValue, previewSample), [htmlTemplateValue, previewSample])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const configResponse = await getReportConfig()
      setTemplate(configResponse?.data ?? null)
    } catch (e) {
      console.log(e)
      setErrorMessage('데이터 로딩 실패')
      setTemplate(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setSubjectTemplateValue(template?.subjectTemplate ?? '')
    setHtmlTemplateValue(template?.htmlTemplate ?? '')
  }, [template])

  const handleSave = useCallback(async () => {
    if (!template) return

    setIsSaving(true)
    setErrorMessage('')

    try {
      const updated = await updateReportConfig({
        subjectTemplate: subjectTemplateValue,
        htmlTemplate: htmlTemplateValue,
        description: template?.description ?? '',
        enabled: template?.enabled ?? true
      })

      if (!updated?.data) {
        setErrorMessage('리포트 설정 저장에 실패했습니다.')
        return
      }

      setTemplate(updated.data)
    } catch (e) {
      console.log(e)
      setErrorMessage('리포트 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }, [htmlTemplateValue, subjectTemplateValue, template])

  const handleReset = useCallback(() => {
    setSubjectTemplateValue(template?.subjectTemplate ?? '')
    setHtmlTemplateValue(template?.htmlTemplate ?? '')
  }, [template])

  return (
    <PageRoot>
      <ReportManagementHeader isLoading={isLoading} onRefresh={loadData} />

      {isLoading ? <LoadingBox>로딩 중...</LoadingBox> : null}
      {errorMessage ? <ErrorBox>{errorMessage}</ErrorBox> : null}

      <PreviewPanel>
        <PreviewPanelHeader>
          <PreviewPanelTitle>미리보기</PreviewPanelTitle>
        </PreviewPanelHeader>

        {template ? (
          <SplitGrid>
            <EditorPane>
              <PaneTitle>템플릿 편집</PaneTitle>
              <TemplateInput
                value={subjectTemplateValue}
                onChange={(e) => setSubjectTemplateValue(e.target.value)}
                placeholder="제목 템플릿을 입력하세요. 예: [{eventId}] {summary}"
              />
              <TemplateTextarea
                value={htmlTemplateValue}
                onChange={(e) => setHtmlTemplateValue(e.target.value)}
                placeholder="HTML 본문 템플릿을 입력하세요."
              />
              <EditorActions>
                <SecondaryButton type="button" onClick={handleReset} disabled={isSaving}>
                  되돌리기
                </SecondaryButton>
                <SaveButton type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? '저장 중...' : '저장'}
                </SaveButton>
              </EditorActions>
            </EditorPane>

            <PreviewPane>
              <PaneTitle>실시간 미리보기</PaneTitle>
              <PreviewSubjectCard>{previewSubject || '-'}</PreviewSubjectCard>
              <PreviewHtmlFrame title="리포트 미리보기" srcDoc={previewHtml || ''} />
            </PreviewPane>
          </SplitGrid>
        ) : (
          <EmptyPreview>리포트 설정이 없습니다.</EmptyPreview>
        )}
      </PreviewPanel>
    </PageRoot>
  )
}

export default ReportManagement
