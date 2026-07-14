import styled, { css } from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`

export const TitleWrap = styled.div`
  min-width: 0;
`

export const PageTitle = styled.h1`
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  color: #111827;
`

export const PageDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const controlStyle = css`
  height: 42px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #ffffff;
  padding: 0 14px;
  font-size: 14px;
  color: #111827;
`

export const SearchInput = styled.input`
  ${controlStyle}
  min-width: 260px;
`

export const FilterSelect = styled.select`
  ${controlStyle}
  min-width: 140px;
`

export const PrimaryButton = styled.button`
  height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;

  &:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 82px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
`

export const SummaryValue = styled.div`
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: ${({ $tone }) => {
    if ($tone === 'success') return '#059669'
    if ($tone === 'danger') return '#dc2626'
    if ($tone === 'warning') return '#d97706'
    if ($tone === 'primary') return '#2563eb'
    return '#111827'
  }};
`

export const SummaryLabel = styled.div`
  margin-top: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const AddCard = styled.button`
  min-height: 230px;
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &:hover {
    border-color: #2563eb;
    background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
    transform: translateY(-1px);
  }
`

export const AddCardInner = styled.div`
  padding: 24px;
  text-align: center;
`

export const AddIcon = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 18px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 300;
`

export const AddTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`

export const AddDescription = styled.p`
  margin: 6px auto 0;
  max-width: 220px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
`

export const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
`

export const LoadingBox = styled.div`
  margin-top: 8px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
`

export const ErrorBox = styled.div`
  margin-top: 8px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.6;
`

export const JsonPreview = styled.pre`
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fafcff;
  color: #334155;
  font-size: 12px;
  line-height: 1.55;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`

export const CompleteModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const CompleteModalCard = styled.div`
  width: min(420px, 100%);
  border-radius: 16px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
  padding: 24px;
`

export const CompleteModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 700;
  color: #111827;
`

export const CompleteModalDescription = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
`

export const CompleteModalActions = styled.div`
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
`
