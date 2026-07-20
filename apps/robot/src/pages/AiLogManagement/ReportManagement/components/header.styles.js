import styled from 'styled-components'

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 960px) {
    flex-direction: column;
    align-items: stretch;
  }
`

export const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  flex: 1;
`

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
`

export const PageDescription = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
`

export const TemplateInfoCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
`

export const TemplateInfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 4px;
  }
`

export const TemplateInfoLabel = styled.div`
  min-width: 72px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
`

export const TemplateInfoValue = styled.div`
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;

  @media (max-width: 960px) {
    justify-content: flex-end;
  }

  @media (max-width: 640px) {
    width: 100%;
    justify-content: stretch;
  }
`

const baseButton = styled.button`
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

  @media (max-width: 640px) {
    flex: 1;
  }
`

export const PrimaryButton = styled(baseButton)`
  border: none;
  background: #2563eb;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`

export const SecondaryButton = styled(baseButton)`
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }
`

export const TemplateInfo = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`
