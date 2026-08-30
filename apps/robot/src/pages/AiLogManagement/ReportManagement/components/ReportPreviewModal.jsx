import { useEffect, useMemo, useState } from 'react'
import { updateReportConfig } from '@/apis/ai/aiApis'
import {
  PreviewModalBackdrop,
  PreviewModalCard,
  PreviewModalTitle,
  PreviewGrid,
  EditorPane,
  PreviewPane,
  SectionTitle,
  PreviewMeta,
  SubjectTemplateInput,
  HtmlTemplateTextarea,
  PreviewSubjectCard,
  PreviewHtmlFrame,
  HelperText,
  ErrorText,
  ModalActions,
  CloseButton,
  EditButton,
  SaveButton,
  CancelButton
} from './modal.styles'

const replaceTemplateTokens = (template, payload) => {
  let result = String(template ?? '')

  // Keep label-token mapping stable for preview:
  // 기능 -> {func}, 이슈 summary -> {summary}, 이슈 원인 -> {reason}
  result = result
    .replace(/(기능[^{}]*?)\{\s*(summary|reason|solutions)\s*\}/gi, '$1{func}')
    .replace(/(이슈\s*(?:요약|summary)[^{}]*?)\{\s*(reason|func|funcKey)\s*\}/gi, '$1{summary}')
    .replace(/(이슈\s*원인[^{}]*?)\{\s*(summary|func|funcKey)\s*\}/gi, '$1{reason}')

  Object.entries(payload ?? {}).forEach(([key, value]) => {
    const token = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g')
    result = result.replace(token, String(value ?? ''))
  })

  return result
}

const ReportPreviewModal = ({ open, previewSample, previewSubject, previewHtml, template, onClose, onUpdated }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [subjectTemplateValue, setSubjectTemplateValue] = useState('')
  const [htmlTemplateValue, setHtmlTemplateValue] = useState('')

  useEffect(() => {
    if (!open) return

    setIsEditing(false)
    setIsSaving(false)
    setErrorMessage('')
    setSubjectTemplateValue(template?.subjectTemplate ?? '')
    setHtmlTemplateValue(template?.htmlTemplate ?? '')
  }, [open, template])

  const renderedSubject = useMemo(() => {
    if (isEditing) {
      return replaceTemplateTokens(subjectTemplateValue, previewSample) || '-'
    }

    return previewSubject || '-'
  }, [isEditing, previewSample, previewSubject, subjectTemplateValue])

  const renderedHtml = useMemo(() => {
    if (isEditing) {
      return replaceTemplateTokens(htmlTemplateValue, previewSample) || ''
    }

    return previewHtml || ''
  }, [htmlTemplateValue, isEditing, previewHtml, previewSample])

  const handleStartEdit = () => {
    setErrorMessage('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setErrorMessage('')
    setIsEditing(false)
    setSubjectTemplateValue(template?.subjectTemplate ?? '')
    setHtmlTemplateValue(template?.htmlTemplate ?? '')
  }

  const handleSave = async () => {
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

      setIsEditing(false)

      if (typeof onUpdated === 'function') {
        onUpdated(updated.data)
      }
    } catch (e) {
      console.log(e)
      setErrorMessage('리포트 설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <PreviewModalBackdrop onClick={onClose}>
      <PreviewModalCard onClick={(e) => e.stopPropagation()}>
        <PreviewModalTitle>리포트 미리보기</PreviewModalTitle>

        <PreviewGrid>
          <EditorPane>
            <SectionTitle>HTML 제목 / 본문</SectionTitle>
            <SubjectTemplateInput
              value={subjectTemplateValue}
              onChange={(e) => setSubjectTemplateValue(e.target.value)}
              readOnly={!isEditing}
              placeholder="제목 템플릿을 입력하세요. 예: [{eventId}]{summary}"
            />

            <HtmlTemplateTextarea
              value={htmlTemplateValue}
              onChange={(e) => setHtmlTemplateValue(e.target.value)}
              readOnly={!isEditing}
              spellCheck={false}
              placeholder="HTML 본문 템플릿을 입력하세요."
            />
          </EditorPane>

          <PreviewPane>
            <SectionTitle>미리보기</SectionTitle>

            <PreviewSubjectCard>{renderedSubject || '-'}</PreviewSubjectCard>

            <PreviewHtmlFrame title="리포트 미리보기" srcDoc={renderedHtml || ''} />
          </PreviewPane>
        </PreviewGrid>
        <HelperText>
          {isEditing
            ? '왼쪽 제목/본문 템플릿을 수정하면 오른쪽 미리보기에 바로 반영됩니다.'
            : '수정 버튼을 누르면 제목 템플릿과 HTML 본문을 편집할 수 있습니다.'}
        </HelperText>
        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}

        <ModalActions>
          <CloseButton type="button" onClick={onClose}>
            닫기
          </CloseButton>

          {!isEditing ? (
            <EditButton type="button" onClick={handleStartEdit}>
              수정
            </EditButton>
          ) : (
            <>
              <CancelButton type="button" onClick={handleCancelEdit} disabled={isSaving}>
                취소
              </CancelButton>

              <SaveButton type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </SaveButton>
            </>
          )}
        </ModalActions>
      </PreviewModalCard>
    </PreviewModalBackdrop>
  )
}

export default ReportPreviewModal
