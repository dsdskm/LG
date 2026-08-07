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

export const CanvasNoteLayer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
`

export const CanvasNoteCard = styled.div`
  position: absolute;
  pointer-events: auto;
  width: 240px;
  min-height: 150px;
  border-radius: 14px;
  border: 1px solid rgba(234, 179, 8, 0.45);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.95));
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
  color: #3f3f46;
  overflow: hidden;
  user-select: none;
`

export const CanvasNoteHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(251, 191, 36, 0.2);
  font-size: 12px;
  font-weight: 700;
  cursor: grab;
  touch-action: none;
`

export const CanvasNoteTitle = styled.span`
  letter-spacing: 0.02em;
`

export const CanvasNoteHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

export const CanvasNoteSizeButton = styled.button`
  border: 1px solid rgba(161, 98, 7, 0.18);
  background: rgba(255, 255, 255, 0.6);
  color: #854d0e;
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
`

export const CanvasNoteColorButton = styled.button<{ $active?: boolean; $swatch: string }>`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(120, 53, 15, 0.75)' : 'rgba(120, 53, 15, 0.25)')};
  background: ${({ $swatch }) => $swatch};
  box-shadow: ${({ $active }) => ($active ? '0 0 0 2px rgba(255, 255, 255, 0.7)' : 'none')};
  cursor: pointer;
`

export const CanvasNoteResizeHandle = styled.div`
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 14px;
  height: 14px;
  border-right: 2px solid rgba(120, 53, 15, 0.45);
  border-bottom: 2px solid rgba(120, 53, 15, 0.45);
  border-radius: 0 0 12px 0;
  cursor: nwse-resize;
  touch-action: none;
`

export const CanvasNoteDeleteButton = styled.button`
  border: 0;
  background: transparent;
  color: #a16207;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
`

export const CanvasNoteTextarea = styled.textarea`
  width: 100%;
  height: calc(100% - 36px);
  min-height: 114px;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  padding: 10px 12px 12px;
  font: inherit;
  color: inherit;
  line-height: 1.5;
  user-select: text;
`
