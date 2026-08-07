import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f7f8fb;
  min-height: 100%;
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
`

export const HeaderButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const MoreMenuWrapper = styled.div`
  position: relative;
`

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  min-width: 180px;
  padding: 8px;
  border: 1px solid #dde3ea;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.08),
    0 2px 6px rgba(15, 23, 42, 0.06);
`

export const DropdownMenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 36px;
  padding: 0 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $danger }) => ($danger ? '#ef4444' : '#334155')};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ $danger }) => ($danger ? '#fff1f2' : '#f8fafc')};
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

export const SummaryCard = styled.div`
  border: 1px solid #e5e7eb; /* #dce2ea → gray-200 */
  border-radius: 8px; /* 16px → rounded-lg */
  background: #ffffff;
  overflow: hidden;
`

export const SummaryCardHeader = styled.div`
  min-height: 28px; /* 40px → ~28px (py-1.5 + text-xs) */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px; /* 0 14px → py-1.5(6px) px-4(16px) */
  border-bottom: 1px solid #f3f4f6; /* #edf1f5 → gray-100 */
`

export const SummaryCardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`

export const SummaryCardHeaderRight = styled.div`
  color: #4b5563;
  font-size: 14px;
  font-weight: 700;
`

export const SummaryValueStrong = styled.span`
  color: #111827;
  font-weight: 600;
`

export const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  tr {
    height: 28px; /* 44px → ~28px (py-1.5 + text-xs) */
  }

  th,
  td {
    padding: 0 16px; /* 6px → 0 (수직 패딩 제거) */
    border-bottom: 1px solid #f9fafb; /* #edf1f5 → gray-50 */
    font-size: 14px;
    line-height: 1.4;
    vertical-align: middle;
  }

  tr:last-child th,
  tr:last-child td {
    border-bottom: none;
  }

  th {
    width: 96px; /* 120px → w-24 */
    text-align: left;
    font-weight: 600;
    color: #374151;
    background: #ffffff;
    white-space: nowrap;
  }

  td {
    color: #6b7280;
    font-weight: 500;
    text-align: right;
  }
`

export const TableCellRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 28px; /* 44px → 28px */
  text-align: right;
`

export const TableCellLeft = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 28px;
  text-align: left;
`

export const TableCellBetween = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 28px; /* 44px → 28px */
`

const baseStatusBadge = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
`

export const StatusBadgeActive = styled.span`
  ${baseStatusBadge}
  background: #e8f7ef;
  color: #0f9f63;

  .dot {
    background: #10b981;
  }
`

export const StatusBadgeInactive = styled.span`
  ${baseStatusBadge}
  background: #f2f4f7;
  color: #6b7280;

  .dot {
    background: #98a2b3;
  }
`

export const StatusBadgeDraft = styled.span`
  ${baseStatusBadge}
  background: #eef4ff;
  color: #2563eb;

  .dot {
    background: #3b82f6;
  }
`

const baseDeployBadge = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
`

export const DeployBadgePending = styled.span`
  ${baseDeployBadge}
  background: #eef4ff;
  color: #2563eb;
`

export const DeployBadgeSuccess = styled.span`
  ${baseDeployBadge}
  background: #e8f7ef;
  color: #0f9f63;
`

export const DeployBadgeError = styled.span`
  ${baseDeployBadge}
  background: #fff1f2;
  color: #f43f5e;
`

const baseDeployCount = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
`

export const DeployCountSuccess = styled.span`
  ${baseDeployCount}
  color: #10b981;
`

export const DeployCountError = styled.span`
  ${baseDeployCount}
  color: #f43f5e;
`

export const DeployCountPending = styled.span`
  ${baseDeployCount}
  color: #f59e0b;
`

export const Section = styled.section`
  border: 1px solid #dce2ea;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  min-height: 620px;
`

export const FlowArea = styled.div`
  display: flex;
  flex-direction: column;
  height: 620px;
  min-height: 620px;
  background: #ffffff;
`

export const FlowCanvasWrap = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  width: 100%;
  overflow: hidden;
`

export const PageMessage = styled.div`
  padding: 40px 0;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
`

/**
 * 플로우 정의 탭(저장 / 체크포인트) 영역.
 * @repo/ui Tabs 의 기본 여백이 좁아, 이 화면에서만 탭 버튼의 좌우/상하 여백과 간격을 넓힌다.
 * 구조: Tabs(div) > TabList(div, 첫 번째 자식) > TabItem(button)
 */
export const FlowTabsWrap = styled.div`
  width: 100%;

  & > div > div:first-of-type {
    gap: 8px;
    margin-bottom: 24px;

    > button {
      padding: 14px 24px;
      border-radius: 8px 8px 0 0;
      font-weight: 700;
    }
  }
`
