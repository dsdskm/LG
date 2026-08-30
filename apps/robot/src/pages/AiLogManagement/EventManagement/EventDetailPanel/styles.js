import styled, { css } from 'styled-components'

const getLevelColor = (level, isErrorLine) => {
  if (isErrorLine) return '#fecaca'
  if (level === 'ERROR') return '#fca5a5'
  if (level === 'WARN') return '#fcd34d'
  if (level === 'INFO') return '#93c5fd'
  if (level === 'DEBUG') return '#cbd5e1'
  return '#e2e8f0'
}

export const PanelRoot = styled.aside`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #fcfcfd;
  flex-shrink: 0;
`

export const PanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const PanelTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const PanelBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #ef4444;
  background: #fef2f2;
  border: 1px solid #fecaca;
  flex-shrink: 0;
`

export const PanelCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 16px;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`

export const PanelBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
`

export const Section = styled.section`
  margin-bottom: 16px;
`

export const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
`

export const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #475569;
`

export const SectionBody = styled.div`
  background: #ffffff;
`

export const InfoTable = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
`

export const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  min-height: 44px;
  border-bottom: ${({ $last }) => ($last ? 'none' : '1px solid #eef2f7')};
`

export const InfoKey = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`

export const InfoValue = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  font-size: 13px;
  color: #334155;
  word-break: break-word;
  min-width: 0;
`

export const InfoValueBetween = styled(InfoValue)`
  justify-content: space-between;
  gap: 12px;
`

export const InfoValueCenter = styled(InfoValue)`
  justify-content: center;
  text-align: center;
`

export const AnalysisBox = styled.div`
  padding: 14px 16px;
  border: 1px solid #e9d5ff;
  background: #faf5ff;
  border-radius: 10px;
  color: #374151;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
`

export const AssigneeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

export const AssigneeCard = styled.div`
  width: 180px;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #f9fbff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const AssigneeName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #111827;
`

export const AssigneeIdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const AssigneeMeta = styled.div`
  display: grid;
  gap: 6px;
  flex: 1;
  align-content: start;
`

export const AssigneeMetaLine = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  word-break: break-word;
`

export const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
`

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

export const ActionCardList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const ActionCard = styled.button`
  border: 1px solid #c7d7fe;
  background: #e8f0ff;
  color: #1d4ed8;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #dbe8ff;
  }
`

export const SuggestedActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const SuggestedActionItem = styled.button`
  text-align: left;
  border: 1px solid #c7d7fe;
  background: #f5f8ff;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &:hover {
    background: #e8f0ff;
  }
`

export const SuggestedActionName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
`

export const SuggestedActionReason = styled.span`
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`

export const ActionConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2300;
`

export const ActionConfirmCard = styled.div`
  width: min(360px, calc(100vw - 48px));
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
  padding: 18px;
`

export const ActionConfirmText = styled.div`
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
`

export const ActionConfirmActions = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const ActionConfirmButton = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

export const ActionConfirmPrimaryButton = styled(ActionConfirmButton)`
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
`

export const MutedText = styled.span`
  font-size: 13px;
  color: #94a3b8;
`

/* ── 분석 결과 수동 편집 ───────────────────────────────────── */
export const HeaderActionButton = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) => ($primary ? '#2563eb' : '#cbd5e1')};
  background: ${({ $primary }) => ($primary ? '#2563eb' : '#ffffff')};
  color: ${({ $primary }) => ($primary ? '#ffffff' : '#334155')};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const FieldInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`

export const FieldSelect = styled.select`
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`

export const FieldTextarea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
  background: #ffffff;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
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

export const LogButton = styled.button`
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;

  ${({ $disabled }) =>
    $disabled
      ? css`
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        `
      : css`
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;

          &:hover {
            background: #f8fafc;
            border-color: #94a3b8;
          }
        `}
`

export const LogModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 헤더/다른 모달(9999~)보다 위에 오도록. (이전 낮은 값은 헤더 밑으로 깔렸음) */
  z-index: 10000;
`

export const LogModal = styled.div`
  width: min(960px, calc(100vw - 48px));
  max-height: calc(100vh - 64px);
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

export const LogModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #fcfcfd;
  flex-shrink: 0;
`

export const LogModalTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #334155;
`

export const LogModalCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 16px;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: #f1f5f9;
    color: #334155;
  }
`

export const LogModalBody = styled.div`
  margin: 0;
  padding: 16px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.7;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 0;
  /* 고정 높이(700px)는 작은 화면에서 모달이 max-height 를 넘겨 상단이 잘렸음.
     남는 공간만 채우고 내부 스크롤하도록 flex 로 변경. */
  flex: 1 1 auto;
`

export const LogBundle = styled.div`
  margin-bottom: 16px;
  border: 1px solid #1e293b;
  border-radius: 10px;
  overflow: hidden;
  background: #111827;

  &:last-child {
    margin-bottom: 0;
  }
`

export const LogBundleHeader = styled.div`
  margin: 0;
  padding: 10px 14px;
  background: #1e293b;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid #334155;
`

export const LogLineRow = styled.div`
  display: grid;
  grid-template-columns: 72px 72px 1fr;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
  /* 에러 라인=빨강, 분석 사용 구간=파랑 좌측 강조, 그 외=흐리게 */
  border-left: 3px solid
    ${({ $error, $analyzed }) => ($error ? '#ef4444' : $analyzed ? '#6366f1' : 'transparent')};
  background: ${({ $error, $analyzed }) =>
    $error ? '#3f1d1d' : $analyzed ? '#1e2540' : 'transparent'};
  color: ${({ $error, $analyzed }) => ($error ? '#fecaca' : $analyzed ? '#e2e8f0' : '#64748b')};
  font-size: 12px;
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  &:last-child {
    border-bottom: none;
  }
`

export const LogLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 14px;
  font-size: 11px;
  color: #94a3b8;
`

export const LogLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: ${({ $kind }) =>
      $kind === 'error' ? '#ef4444' : $kind === 'analyzed' ? '#6366f1' : '#334155'};
  }
`

export const LogIndex = styled.span`
  color: ${({ $error }) => ($error ? '#fecaca' : '#94a3b8')};
`

export const LogLevel = styled.span`
  font-weight: 700;
  color: ${({ $level, $error }) => getLevelColor($level, $error)};
`

export const LogMessage = styled.span`
  white-space: pre-wrap;
  word-break: break-word;
`

export const EmptyLogText = styled.div`
  color: #94a3b8;
  font-size: 13px;
`
