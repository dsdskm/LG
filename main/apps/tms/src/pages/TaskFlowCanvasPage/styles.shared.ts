import styled, { css } from 'styled-components'

/** Glassmorphic 패널 컨테이너 (PropertyPanel / PalettePanel 공통) */
export const PanelRoot = styled.aside`
  min-height: 0;
  overflow: auto;

  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.7);
  padding: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
`

/** 흰 카드 컨테이너 (PropertyPanel Card / VisualDataSection FieldCard 공통) */
export const Card = styled.div`
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 12px;
`

/** 점선 안내 박스 베이스 (EmptyState / InfoBox 공통) */
export const dashedBox = css`
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  background: #ffffff;

  font-size: 14px;
  font-weight: 500;
  color: #64748b;
`
