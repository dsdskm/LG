import styled, { css } from "styled-components";

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

  /* 박스 드래그 중인 선택 영역 */
  .react-flow__selection {
    background: rgba(var(--t-toggle-active-bg-rgb), 0.12);
    border: 1px dashed var(--t-toggle-active-bg);
  }

  /* 그룹 선택이 확정된 뒤 노드들을 감싸는 사각형 */
  .react-flow__nodesselection-rect {
    background: rgba(var(--t-toggle-active-bg-rgb), 0.08);
    border: 1px dashed var(--t-toggle-active-bg);
  }

  /* 위 사각형은 그룹 영역 전체를 덮으며 클릭을 받아(그룹 통째로 드래그) 안쪽 노드/엣지 클릭을 막는다.
     Ctrl(⌘) 을 누르고 있는 동안에는 통과시켜, 그룹 안 노드/엣지를 개별로 선택 해제할 수 있게 한다 */
  &[data-multiselect='true'] .react-flow__nodesselection-rect {
    pointer-events: none;
  }
`

export const FlowFill = styled.div`
  width: 100%;
  height: 100%;
`

const overlayBase = css`
  position: absolute;
  top: 12px;
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

export const AlignOverlay = styled.div`
  ${overlayBase};
  left: 50%;
  transform: translateX(-50%);

  /* 활성 모드(가로/세로) 버튼은 앱 테마의 활성 상태 색을 따른다.
     (클래식 블루 → #3b82f6 / 모던 뉴트럴 → taupe)
     @repo/ui Button 의 primary 테마는 정적 토큰(--color-primary-70)이라 테마 전환에 반응하지 않으므로,
     theme="light" 버튼에 data-active 로 덮어씌운다.
     (styled(Button) 으로 감싸면 Button 내부 typography className 이 덮여 폰트가 깨진다) */
  & > button[data-active='true'] {
    background: var(--t-toggle-active-bg);
    color: var(--color-neutral-10);
    border-color: transparent;

    /* 테마별 hover 토큰이 없으므로 밝기만 조절해 두 테마 모두에서 자연스럽게 동작시킨다 */
    &:hover:not(:disabled) {
      background: var(--t-toggle-active-bg);
      filter: brightness(0.92);
    }

    &:active:not(:disabled) {
      background: var(--t-toggle-active-bg);
      filter: brightness(0.86);
    }
  }
`

// 선택 노드 복제/삭제 액션 (캔버스 우측 상단)
export const NodeActionOverlay = styled.div`
  ${overlayBase};
  right: 12px;
`
