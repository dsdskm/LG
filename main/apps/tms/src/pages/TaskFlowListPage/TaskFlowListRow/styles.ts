import styled from 'styled-components'

export const Card = styled.section<{ $selectable?: boolean; $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 74px;
  padding: 10px 20px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--t-toggle-active-bg)' : '#d8dde6')};
  border-radius: 8px;
  background: ${({ $selected }) => ($selected ? 'rgba(var(--t-toggle-active-bg-rgb), 0.06)' : '#ffffff')};
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.05),
    0 3px 8px rgba(15, 23, 42, 0.06);

  ${({ $selectable }) => ($selectable ? 'cursor: pointer;' : '')}

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 18px 20px;
  }
`

export const CardLeft = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
`

export const CardRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  flex-shrink: 0;
  min-width: 320px;

  @media (max-width: 1200px) {
    width: 100%;
    min-width: 0;
    justify-content: space-between;
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px;
  }
`

export const RightInfoColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;

  @media (max-width: 1200px) {
    align-items: flex-start;
  }
`

export const FlowMain = styled.div`
  min-width: 0;
  flex: 1;
`

export const FlowTitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

export const FlowVersionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: #f1f3f7;
  color: #586174;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
`

const baseStatusBadge = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
`

export const FlowActiveBadge = styled.span`
  ${baseStatusBadge}
  background: #e8f7ef;
  color: #0f9f63;

  .dot {
    background: #10b981;
  }
`

export const FlowInactiveBadge = styled.span`
  ${baseStatusBadge}
  background: #f2f4f7;
  color: #6b7280;

  .dot {
    background: #98a2b3;
  }
`

export const FlowDesc = styled.p`
  margin: 8px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
`

export const RightTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 1200px) {
    justify-content: flex-start;
  }
`

export const RightBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 1200px) {
    justify-content: flex-start;
  }
`

const baseDeployBadge = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
`

export const DeployStatusBadgeSuccess = styled.span`
  ${baseDeployBadge}
  background: #e8f7ef;
  color: #0f9f63;
`

export const DeployStatusBadgeProgress = styled.span`
  ${baseDeployBadge}
  background: #eef4ff;
  color: #2563eb;
`

export const DeployStatusBadgeMuted = styled.span`
  ${baseDeployBadge}
  background: #f2f4f7;
  color: #6b7280;
`

export const DeployStatusBadgeError = styled.span`
  ${baseDeployBadge}
  background: #fdecec;
  color: #d92d20;
`

export const UpdatedAtText = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
`

// 선택 모드에서 카드 왼쪽에 표시되는 체크박스 영역
export const SelectCheckWrap = styled.div`
  display: inline-flex;
  align-items: center;
  padding-right: 16px;
  flex-shrink: 0;
`
