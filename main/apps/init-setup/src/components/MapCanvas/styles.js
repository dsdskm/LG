import styled from 'styled-components'

// 지도를 담는 고정 뷰포트 — 스크롤 대신 캔버스 내부 뷰 변환(줌/팬)으로 탐색한다.
//
// cursor 는 여기서 기본값(grab)만 정한다 — 드래그·리사이즈·영역 지정 중에는 index.jsx 의
// 포인터 핸들러가 wrapper.style.cursor 를 직접 바꾼다(프레임마다 리렌더 없이 바꿔야 한다).
export const CanvasViewport = styled.div`
  position: relative;
  flex: 1;
  /* 부모 높이가 확정되지 않는 레이아웃에서도 캔버스가 찌그러지지 않도록 최소 높이 확보 */
  min-height: 400px;
  overflow: hidden;
  background: #e8e8e8;
  cursor: grab;
  touch-action: none;
`

export const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  /* 지도는 격자 이미지라 보간하면 흐려진다 — 픽셀 그대로 확대한다. */
  image-rendering: pixelated;
`

// 그릴 것이 없을 때(구독 없음 · 그리드맵 대기) 캔버스 자리를 지키는 안내 화면.
// 뷰포트와 같은 배경·최소 높이라 지도가 들어올 때 레이아웃이 튀지 않는다.
export const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 400px;
  background: #e8e8e8;
`

export const PlaceholderText = styled.span`
  color: #888;
  font-size: 16px;
`

/**
 * 가상 장애물 그리기 중에 지도 위에 겹쳐 띄우는 조작 줄.
 *
 * 형태 선택과 "지금까지 찍은 좌표" 를 지도를 보면서 확인해야 하므로 목록 패널이 아니라 지도
 * 상단에 얹는다. 지도 조작(팬/줌/클릭)을 가로채면 안 되므로 기본은 pointer-events: none 이고,
 * 실제로 눌러야 하는 자식(드롭다운)만 되살린다.
 */
export const ObstacleDrawBar = styled.div`
  position: absolute;
  top: 0.8rem;
  left: 0.8rem;
  right: 0.8rem;
  z-index: 3;
  display: flex;
  flex-direction: column;
  /* 자식이 가로로 늘어나지 않게 한다 — 판이 지도를 덮으면 그리는 자리가 가려진다.
     (여기서 잡아 주면 각 판에 align-self 를 걸지 않아도 되고, 아래 Row 의
     align-items: flex-end 도 의도대로 동작한다) */
  align-items: flex-start;
  gap: 0.6rem;
  pointer-events: none;
`

export const ObstacleDrawBarRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 1.2rem;
  flex-wrap: wrap;

  /* 드롭다운만 조작 대상 — 배경/문구 위에서는 지도를 그대로 끌 수 있어야 한다.
     뷰포트가 그리기 중 cursor: crosshair 를 쓰므로, 여기서는 평소 커서로 되돌린다
     (조작 줄 위에서는 좌표를 찍는 것이 아니다). */
  & > .control {
    pointer-events: auto;
    cursor: auto;
    background: rgba(255, 255, 255, 0.92);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.6rem;
  }
`

// 안내 문구 / 좌표 목록 — 지도(흰 바탕·검은 벽) 위에서 읽히도록 반투명 판을 깐다.
export const ObstacleDrawPanel = styled.div`
  max-width: 100%;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(41, 128, 185, 0.35);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.8rem;
  font-size: 1.2rem;
  line-height: 1.5;
  color: #34495e;

  & .title {
    font-weight: 700;
    margin-right: 0.6rem;
  }

  & .points {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1.2rem;
    font-family: monospace;
  }
`
