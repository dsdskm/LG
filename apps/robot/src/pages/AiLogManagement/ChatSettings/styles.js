import styled from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 18px;
  padding: 20px 18px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
`

export const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const PageTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
`

export const PageDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
`

export const LoadingBox = styled.div`
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
`

export const ErrorBox = styled.div`
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.6;
`

const panelBox = `
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: none;
`

export const SettingCard = styled.section`
  ${panelBox}
  padding: 18px;
  display: grid;
  gap: 12px;
  align-content: start;
  overflow: hidden;
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #334155;
`

export const ComingSoonBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
`

export const OptionList = styled.div`
  display: grid;
  gap: 8px;
`

export const OptionButton = styled.button`
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

export const ActiveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #bfdbfe;
  background: #dbeafe;
  color: #1e40af;
  font-size: 11px;
  font-weight: 700;
`

export const PlaceholderField = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px dashed #d0d7de;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
`

export const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const PrimaryButton = styled.button`
  height: 36px;
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

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const ModalCard = styled.div`
  width: min(420px, 100%);
  border-radius: 16px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
  padding: 24px;
`

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`

export const ModalDescription = styled.p`
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
`

export const ModalActions = styled.div`
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
`

export const ManagementGrid = styled.div`
  display: grid;
  gap: 16px;
`

export const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`

export const SmallBadge = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
`

export const PromptCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  background: #ffffff;
`

export const PromptMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
`

export const SectionGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
`

export const FieldGroup = styled.div`
  display: grid;
  gap: 6px;
`

export const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #334155;
`

export const FieldHint = styled.span`
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
`

export const TextInput = styled.input`
  width: 100%;
  height: 38px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  color: #334155;
`

export const InlineFields = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
`

export const PromptTextarea = styled.textarea`
  width: 100%;
  min-height: 200px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #f9fbff;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.65;
  color: #334155;
  resize: vertical;
  font-family: inherit;
`

export const PromptFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`

export const SecondaryTextButton = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const ToggleButton = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#334155')};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`

export const ToolRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
`

export const ToolLabel = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
`

export const ToolTitle = styled.strong`
  font-size: 13px;
  color: #111827;
`

export const ToolDescription = styled.span`
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`

export const HistoryList = styled.div`
  display: grid;
  gap: 12px;
`

export const HistoryCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
`

export const HistoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
`

export const DebugSummaryBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #bfdbfe;
  background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
`

export const DebugChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ $tone = 'slate' }) => {
    if ($tone === 'blue') return '#bfdbfe'
    if ($tone === 'green') return '#bbf7d0'
    if ($tone === 'amber') return '#fed7aa'
    if ($tone === 'rose') return '#fecdd3'
    return '#dbe3ef'
  }};
  background: ${({ $tone = 'slate' }) => {
    if ($tone === 'blue') return '#eff6ff'
    if ($tone === 'green') return '#f0fdf4'
    if ($tone === 'amber') return '#fff7ed'
    if ($tone === 'rose') return '#fff1f2'
    return '#f8fafc'
  }};
  color: ${({ $tone = 'slate' }) => {
    if ($tone === 'blue') return '#1d4ed8'
    if ($tone === 'green') return '#047857'
    if ($tone === 'amber') return '#c2410c'
    if ($tone === 'rose') return '#be123c'
    return '#475569'
  }};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
`

export const DebugGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`

export const DebugMetricCard = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
`

export const DebugMetricLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`

export const DebugMetricValue = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.5;
  word-break: break-word;
`

export const DebugDetailPanel = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #dbe3ef;
  background: #f8fafc;
`

export const DebugDetailTitle = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: #1e3a8a;
`

export const DebugMonoBlock = styled.pre`
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
`

export const HistoryMessage = styled.pre`
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #dbe3ef;
  font-size: 12px;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
`
