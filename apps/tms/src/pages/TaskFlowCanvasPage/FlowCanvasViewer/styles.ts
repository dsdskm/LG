import styled from 'styled-components'
import {
  PanelRoot as DrawPanelRoot,
  CanvasWrapper as DrawCanvasWrapper,
  FlowFill as DrawFlowFill
} from '../DrawPanel/styles'

export const PanelRoot = DrawPanelRoot
export const CanvasWrapper = DrawCanvasWrapper
export const FlowFill = DrawFlowFill

// 캔버스+속성패널(위) 과 점검 컨트롤 바(아래) 를 세로로 쌓는 최상위 래퍼
export const InspectShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
`

export const CanvasRoot = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  width: 100%;
  flex: 1;
  min-height: 0;
`

export const CanvasMain = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 12px;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

export const FlowTitleBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  border-radius: 12px;
  border: 1px solid #f3f4f6;
  background: #f9fafb;
`

export const FlowTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const FlowTitleLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
`

export const FlowTitleName = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #7ba5c1;
`

export const LegendWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

export const LegendDot = styled.span<{ $border: string; $bg: string }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 2px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
`

export const LegendLabel = styled.span`
  font-size: 11px;
  color: #6b7280;
`

export const SegmentedWrap = styled.div`
  display: inline-flex;
  align-items: center;
  margin: 10px;
`

export const SegmentedButton = styled.button<{
  $active?: boolean
  $first?: boolean
  $last?: boolean
}>`
  height: 36px;
  padding: 0 14px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#cbd5e1')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#0f172a')};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  ${({ $first }) =>
    $first
      ? `
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
  `
      : ''}

  ${({ $last }) =>
    $last
      ? `
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
  `
      : ''}

  & + & {
    margin-left: -1px;
  }

  &:hover {
    background: ${({ $active }) => ($active ? '#dbeafe' : '#f8fafc')};
  }
`

export const TargetSelectWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`

export const TargetSelect = styled.select`
  appearance: none;
  height: 36px;
  min-width: 180px;
  padding: 0 36px 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #94a3b8;
  }
`

export const TargetSelectArrow = styled.span`
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: #64748b;
  font-size: 12px;
`

export const CanvasFlowWrap = styled.div`
  min-width: 0;
  min-height: 0;
  flex: 1;
`

export const InspectBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
`

export const InspectGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const InspectLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`

export const InspectErrorText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #be123c;
  cursor: help;
`

export const TickRateControl = styled.div`
  display: inline-flex;
  align-items: center;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
`

export const TickRateButton = styled.button`
  width: 34px;
  height: 100%;
  border: none;
  background: #ffffff;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
  }

  &:disabled {
    color: #cbd5e1;
    cursor: not-allowed;
  }
`

export const TickRateInput = styled.input`
  width: 56px;
  height: 100%;
  border: none;
  border-left: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;

  &:focus {
    outline: none;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  -moz-appearance: textfield;
  appearance: textfield;
`

// auto/manual 세그먼트와 컨트롤 버튼 사이의 구분선
export const Divider = styled.span`
  width: 1px;
  height: 24px;
  background: #d1d5db;
  margin: 0 4px;
`

// 점검 컨트롤 버튼 묶음 (divider 바로 옆에 좌측 정렬)
export const ControlsGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

type CtrlVariant = 'green' | 'orange' | 'red' | 'blue' | 'gray'

const CTRL_VARIANT: Record<CtrlVariant, { bg: string; hover: string }> = {
  green: { bg: '#16a34a', hover: '#15803d' },
  orange: { bg: '#f59e0b', hover: '#d97706' },
  red: { bg: '#dc2626', hover: '#b91c1c' },
  blue: { bg: '#2563eb', hover: '#1d4ed8' },
  gray: { bg: '#64748b', hover: '#475569' }
}

// 아이콘 + 영문 텍스트 컨트롤 버튼
export const CtrlButton = styled.button<{ $variant: CtrlVariant }>`
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ $variant }) => CTRL_VARIANT[$variant].bg};

  &:hover {
    background: ${({ $variant }) => CTRL_VARIANT[$variant].hover};
  }
`

export const PropertyPanelWrap = styled.aside`
  min-width: 0;
  min-height: 0;
  height: 100%;

  display: flex;
  flex-direction: column;

  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  overflow: hidden;
`

export const PropertyPanelHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
`

export const EmptyPanelWrap = styled.div`
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;

  padding: 24px;
`

export const EmptyMapBox = styled.div`
  width: 92px;
  height: 92px;
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
`

export const EmptyMapIcon = styled.div`
  font-size: 24px;
  line-height: 1;
  color: #64748b;
`

export const EmptyMapText = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #475569;
`

export const EmptyPanelText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
  text-align: center;
`

export const SelectedMapWrap = styled.div`
  padding: 16px 16px 0;
`

export const SelectedMapBox = styled.div`
  min-height: 76px;
  border-radius: 14px;
  border: 1px solid #dbeafe;
  background: #eff6ff;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;

  padding: 14px;
`

export const SelectedMapIcon = styled.div`
  font-size: 22px;
  line-height: 1;
  color: #2563eb;
`

export const SelectedMapText = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #1d4ed8;
  text-align: center;
`

export const PanelTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 16px;
`

export const PanelTabButton = styled.button<{ $active?: boolean }>`
  height: 38px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d1d5db')};
  background: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#374151')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? '#dbeafe' : '#f9fafb')};
  }
`

export const InfoRowWrap = styled.div`
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9;

  &:first-child {
    border-top: 0;
  }
`

export const InfoRowLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`

export const InfoRowValue = styled.div`
  min-width: 0;
  font-size: 13px;
  line-height: 1.55;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
`

export const ContentWrap = styled.div`
  padding: 16px;
`
