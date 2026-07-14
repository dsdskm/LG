import styled from "styled-components";

export const PanelRoot = styled.section`
  min-height: 0;
  height: 100%;
`;

export const CanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;

  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);

  &:focus-visible {
    outline: 2px solid rgba(59, 130, 246, 0.35);
    outline-offset: 2px;
  }
`

export const FlowFill = styled.div`
  width: 100%;
  height: 100%;
`

export const AlignOverlay = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  /* 컨테이너 빈 영역은 캔버스 조작을 통과시키되, 버튼은 클릭 가능하게 한다 */
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  & > * {
    pointer-events: auto;
  }
`

