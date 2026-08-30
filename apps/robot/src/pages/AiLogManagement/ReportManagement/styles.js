import styled, { css } from 'styled-components'

const panelStyle = css`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
`

const textEllipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`

export const SummaryText = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`

export const LoadingBox = styled.div`
  ${panelStyle};
  padding: 20px;
  font-size: 14px;
  color: #475569;
`

export const ErrorBox = styled.div`
  ${panelStyle};
  padding: 16px 20px;
  font-size: 14px;
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
`

export const ListPanel = styled.div`
  ${panelStyle};
  overflow: hidden;
`

export const ListHeader = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1fr 1.6fr 0.8fr;
  gap: 0;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;

  @media (max-width: 960px) {
    display: none;
  }
`

export const HeaderCell = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.02em;
`

export const ListBody = styled.div`
  display: flex;
  flex-direction: column;
`

export const ListRow = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 1fr 1.6fr 0.8fr;
  gap: 0;
  align-items: center;
  min-width: 0;
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 960px) {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
`

export const Cell = styled.div`
  min-width: 0;
  font-size: 14px;
  color: #111827;
  ${textEllipsis};

  @media (max-width: 960px) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    white-space: normal;
  }
`

export const MobileLabel = styled.div`
  display: none;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  @media (max-width: 960px) {
    display: block;
  }
`

export const AssigneeList = styled.div`
  ${textEllipsis};

  @media (max-width: 960px) {
    white-space: normal;
    word-break: break-word;
  }
`

const statusToneMap = {
  SUCCESS: {
    text: '#166534',
    background: '#dcfce7',
    border: '#bbf7d0'
  },
  DONE: {
    text: '#166534',
    background: '#dcfce7',
    border: '#bbf7d0'
  },
  SENT: {
    text: '#0369a1',
    background: '#e0f2fe',
    border: '#bae6fd'
  },
  PENDING: {
    text: '#92400e',
    background: '#fef3c7',
    border: '#fde68a'
  },
  FAIL: {
    text: '#b91c1c',
    background: '#fee2e2',
    border: '#fecaca'
  },
  FAILED: {
    text: '#b91c1c',
    background: '#fee2e2',
    border: '#fecaca'
  },
  ERROR: {
    text: '#b91c1c',
    background: '#fee2e2',
    border: '#fecaca'
  },
  UNKNOWN: {
    text: '#475569',
    background: '#f1f5f9',
    border: '#e2e8f0'
  }
}

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ $status }) => statusToneMap[$status]?.border || '#e2e8f0'};
  background: ${({ $status }) => statusToneMap[$status]?.background || '#f1f5f9'};
  color: ${({ $status }) => statusToneMap[$status]?.text || '#475569'};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
`

export const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`

export const PreviewPanel = styled.section`
  ${panelStyle};
  padding: 18px;
  display: grid;
  gap: 14px;
`

export const PreviewPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const PreviewPanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
`

export const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 1040px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const paneStyle = css`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 12px;
  min-width: 0;
`

export const EditorPane = styled.div`
  ${paneStyle};
  display: grid;
  gap: 10px;
  align-content: start;
`

export const PreviewPane = styled.div`
  ${paneStyle};
  display: grid;
  gap: 10px;
  align-content: start;
`

export const PaneTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #334155;
`

const inputBase = css`
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
`

export const TemplateInput = styled.textarea`
  ${inputBase};
  min-height: 72px;
  padding: 10px 12px;
  line-height: 1.5;
  resize: vertical;
`

export const TemplateTextarea = styled.textarea`
  ${inputBase};
  min-height: 460px;
  padding: 12px;
  line-height: 1.6;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
`

export const EditorActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const actionButton = styled.button`
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const SecondaryButton = styled(actionButton)`
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #334155;
`

export const SaveButton = styled(actionButton)`
  border: none;
  background: #2563eb;
  color: #ffffff;
`

export const PreviewSubjectCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
`

export const PreviewHtmlFrame = styled.iframe`
  width: 100%;
  min-height: 540px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
`

export const EmptyPreview = styled.div`
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 22px;
  font-size: 14px;
  color: #64748b;
  background: #f8fafc;
`
