import styled from 'styled-components'
import { SegmentedButton } from '../TaskFlowCanvasPage/FlowCanvasViewer/styles'

// 아래 Section(캔버스)과 좌우 범위 정렬
export const CenteredContent = styled.div`
  width: 100%;

  @media all and (min-width: 1580px) {
    width: 90%;
    margin: 0 auto;
  }
`

export const RunningBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 9999px;
  background: #dbeafe;
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 600;
  color: #7ba5c1;
`
export const RunningDot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 9999px;
  background: #3b82f6;
  flex-shrink: 0;
`

export const ActiveBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 9999px;
  background: #ecfdf5;
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #a7f3d0;
  color: #047857;
`

export const InactiveBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 9999px;
  background: #f3f4f6;
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  color: #9ca3af;
`

export const MediumSegmentedButton = styled(SegmentedButton)`
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? '#1d4ed8' : '#c0c7d0')};
`
export const Section = styled.section`
  border: 1px solid #dce2ea;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
  min-height: 620px;
`
