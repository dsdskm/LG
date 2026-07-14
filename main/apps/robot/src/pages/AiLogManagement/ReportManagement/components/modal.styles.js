import styled from 'styled-components'

export const PreviewModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 88px 24px 24px;
  background: rgba(15, 23, 42, 0.56);
  box-sizing: border-box;
`

export const PreviewModalCard = styled.div`
  position: relative;
  z-index: 100001;
  width: 70%;
  height: 800px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow: hidden;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
  box-sizing: border-box;

  @media (max-width: 1200px) {
    width: 100%;
    max-height: calc(100vh - 112px);
    padding: 16px;
  }
`

export const PreviewModalTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
`

export const SectionTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #334155;
`

export const PreviewMeta = styled.div`
  font-size: 13px;
  color: #64748b;
`

export const ErrorText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
`

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`

const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const CloseButton = styled(BaseButton)`
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }
`

export const EditButton = styled(BaseButton)`
  border: none;
  background: #2563eb;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`

export const SaveButton = styled(BaseButton)`
  border: none;
  background: #16a34a;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #15803d;
  }
`

export const CancelButton = styled(BaseButton)`
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }
`

export const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
  align-items: stretch;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    overflow: auto;
  }
`

export const EditorPane = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const PreviewPane = styled.div`
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const SubjectTemplateInput = styled.textarea`
  width: 100%;
  min-height: 96px;
  height: 96px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  &:read-only {
    background: #f8fafc;
    color: #334155;
    cursor: default;
  }
`

export const PreviewSubjectCard = styled.div`
  min-height: 96px;
  height: 96px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-word;
  box-sizing: border-box;
  overflow: auto;
`

export const HtmlTemplateTextarea = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  &:read-only {
    opacity: 0.96;
    cursor: default;
  }
`

export const PreviewHtmlFrame = styled.iframe`
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-sizing: border-box;
`

export const HelperText = styled.div`
  min-height: 20px;
  font-size: 13px;
  color: #64748b;
`
