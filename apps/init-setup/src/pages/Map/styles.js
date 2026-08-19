import styled from 'styled-components'
import { StyledPageContent } from '@repo/ui'

// cms 콘텐츠 페이지와 같은 페이지 레이아웃(StyledPageContent > Title/LocationBar/Section).
// 다만 init-setup 은 App.jsx 에서 #mainContent 의 padding 을 제거했으므로(다른 페이지가
// 자체 여백을 갖는다) 이 페이지가 공용 레이아웃과 같은 여백을 직접 준다.
// 지도는 남은 높이를 모두 써야 해서 height: 100% 로 Section 이 늘어나게 한다.
export const StyledMapPageContent = styled(StyledPageContent)`
  height: 100%;
  padding: 20px;
`

// 위치 선택(좌) + 매핑 상태(우). LocationBar 가 자체 margin-bottom 을 갖고 있어 여백은 그대로 쓴다.
export const LocationRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.6rem;
  flex-wrap: wrap;
`

// 매핑 진행 상태(/lio_node/status). 매핑 중 여부를 멀리서도 알아볼 수 있어야 해서
// 토픽 상세 목록에서 떼어내 위치 선택 줄 오른쪽에 배지로 띄운다.
export const MappingStatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-shrink: 0;
  margin-bottom: 2rem;
  padding: 0.8rem 1.6rem;
  border: 1px solid ${({ $active }) => ($active ? 'var(--color-primary-50)' : 'var(--color-secondary-20)')};
  border-radius: var(--radius-sm);
  background: ${({ $active }) => ($active ? 'var(--color-primary-10)' : 'var(--color-neutral-10)')};

  /* 글꼴/크기는 공용 typography 클래스(typographyBody5)를 쓰고 여기서는 색·굵기만 준다. */
  & > .label {
    color: var(--color-neutral-70);
    white-space: nowrap;
  }

  & > .value {
    color: ${({ $active }) => ($active ? 'var(--color-primary-50)' : 'var(--color-neutral-70)')};
    font-weight: 700;
    white-space: nowrap;
  }
`

// Semantic 페이지. SemanticPage 가 Section 들을 직접 내보내는데 공용 StyledPageContent 에는
// gap 이 없어 카드가 붙어 보이므로, Section 사이 간격을 페이지에서 준다.
export const StyledSemanticPageContent = styled(StyledMapPageContent)`
  gap: 1.6rem;
`

// 편집 대상이 정해지기 전(위치 미선택 / 해당 위치에 맵 없음) Section 안에 띄우는 안내 문구.
export const EmptyMessage = styled.p`
  padding: 4rem 0;
  text-align: center;
  color: var(--color-neutral-70);
`

// 위치 선택 줄의 오른쪽 묶음 — 상태 배지들(Map) / 맵 로드 버튼 + 상태 배지들(Semantic).
// LocationRow 가 space-between 이라 배지를 개별 자식으로 두면 가운데로 벌어진다 — 묶어서 오른쪽에 붙인다
// (LocationBar 가 줄바꿈될 때도 오른쪽 정렬이 유지되도록 margin-left: auto 를 함께 준다).
export const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-left: auto;

  /* 배지가 자체 margin-bottom(2rem)을 갖고 있어 버튼에도 같은 여백을 줘 아래선을 맞춘다. */
  & > button {
    margin-bottom: 2rem;
  }
`

// Semantic 지도 칸 — 캔버스 위에 이동 말풍선을 겹치기 위한 기준 컨테이너.
// MapCanvas 의 래퍼가 flex:1 로 늘어나므로 여기서도 flex 를 유지한다.
export const MapClickArea = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
`

// 지도 클릭 위치에 뜨는 말풍선. 클릭 지점(canvasX/Y) 바로 위에 꼬리를 두고 가운데 정렬한다.
// 지도 경계에서 잘리지 않도록 좌우는 clamp 로 캔버스 안쪽에 붙여 둔다.
export const NavBubble = styled.div`
  position: absolute;
  left: clamp(9rem, ${({ $x }) => `${$x}px`}, calc(100% - 9rem));
  top: ${({ $y }) => `${$y}px`};
  transform: translate(-50%, calc(-100% - 1.2rem));
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.2rem;
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-10);
  box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.18);
  white-space: nowrap;

  /* 말풍선 꼬리 — 클릭 지점을 가리킨다. */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -0.7rem;
    width: 1.2rem;
    height: 1.2rem;
    transform: translateX(-50%) rotate(45deg);
    border-right: 1px solid var(--color-secondary-20);
    border-bottom: 1px solid var(--color-secondary-20);
    background: var(--color-neutral-10);
  }

  & > .coords {
    color: var(--color-neutral-80);
    font-weight: 700;
  }

  & > .actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
`

// 좌: 지도 Section(남는 폭 전부) / 우: StatusPanel(자체 고정폭 열, 내부에 Section 3개).
export const MapWorkspace = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 1.6rem;

  & > section {
    min-width: 0;
  }
`
