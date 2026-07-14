import styled from 'styled-components'

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
  margin-bottom: 16px;
`

export const TitleWrap = styled.div`
  min-width: 0;
`

export const PageDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
`

export const LoadingBox = styled.div`
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
`

export const ErrorBox = styled.div`
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.6;
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  @media (max-width: 860px) {
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
  color: ${({ $tone }) => ($tone === 'primary' ? '#2563eb' : '#111827')};
`

export const SummaryLabel = styled.div`
  margin-top: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
`

export const PromptLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const panelBox = `
	border: 1px solid #e5e7eb;
	border-radius: 16px;
	background: #ffffff;
	box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
`

export const LlmPanel = styled.section`
  ${panelBox}
  padding: 18px;
  display: grid;
  gap: 12px;
  align-content: start;
`

export const LlmPanelTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
  color: #334155;
`

export const LlmList = styled.div`
  display: grid;
  gap: 8px;
`

export const LlmButton = styled.button`
  height: 42px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#334155')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const LlmButtonLabel = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const LlmActiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #bfdbfe;
  background: #dbeafe;
  color: #1e40af;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
`

export const PromptPanel = styled.section`
  ${panelBox}
  padding: 18px;
  display: grid;
  gap: 12px;
  min-height: 420px;
`

export const SchemaCard = styled.div`
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #f8fbff;
  padding: 12px;
  display: grid;
  gap: 8px;
`

export const SchemaTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
`

export const SchemaList = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
`

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FuncPanel = styled.section`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
  display: grid;
  gap: 10px;
  align-content: start;
`

export const FuncPanelTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
`

export const FuncList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 420px;
  overflow: auto;
  padding-right: 2px;
`

export const FuncButton = styled.button`
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#334155')};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  padding: 8px 10px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const FuncHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`

export const EditorStack = styled.div`
  display: grid;
  gap: 12px;
`

export const EditorCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
  display: grid;
  gap: 8px;
`

export const SplitRow = styled.div`
  display: grid;
  grid-template-columns: ${(props) =>
    props.$single ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)'};
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SplitColumn = styled.div`
  display: grid;
  gap: 8px;
  align-content: start;
`

export const EditorTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
`

export const EditorDescription = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
`

export const PromptCounter = styled.div`
  margin-top: -2px;
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
  color: ${({ $over }) => ($over ? '#b91c1c' : '#64748b')};
`

export const FuncTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const FuncTabButton = styled.button`
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#334155')};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const CompactTextArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f9fbff;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
  resize: vertical;
  font-family: inherit;
`

export const PreviewBox = styled.pre`
  margin: 0;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f8fafc;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
`

export const NumberInput = styled.input`
  width: 120px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f9fbff;
  padding: 9px 12px;
  font-size: 14px;
  color: #334155;
  font-family: inherit;
`

export const PreviewSectionBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f8fafc;
`

export const PreviewSectionContent = styled.pre`
  margin: 0;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ $tone }) => {
    if ($tone === 'common') return '#1d4ed8'
    if ($tone === 'func') return '#b45309'
    if ($tone === 'fixed') return '#9d174d'
    if ($tone === 'schema') return '#047857'
    return '#1f2937'
  }};
  background: ${({ $tone }) => {
    if ($tone === 'common') return '#eff6ff'
    if ($tone === 'func') return '#fffbeb'
    if ($tone === 'fixed') return '#fdf2f8'
    if ($tone === 'schema') return '#f0fdf4'
    return 'transparent'
  }};
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
`

export const PromptHeader = styled.div`
  display: grid;
  gap: 4px;
`

export const PromptTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  font-weight: 700;
  color: #111827;
`

export const PromptHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
`

export const PromptTextArea = styled.textarea`
  width: 100%;
  min-height: 320px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #f9fbff;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.65;
  color: #334155;
  resize: vertical;
  font-family: inherit;
`

export const PromptDisabledBox = styled.div`
  min-height: 320px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`

export const EmptyState = styled.div`
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
  line-height: 1.6;
`

export const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const SecondaryButton = styled.button`
  height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
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

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
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
