import styled from 'styled-components'

// Modal 본문 — 안내 문구 / POI 경고 / 대상 폴더를 위에서 아래로 쌓는다.
// Modal 이 본문 폭을 자식에게 넘기므로 width: 100% 로 받아 둔다.
export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  line-height: 1.5;
  width: 100%;
`

// 기준 맵이 새로 그려지면서 POI 도 함께 지워진다는 경고 — 되돌릴 수 없는 결과라 경고색으로 띄운다.
export const PoiWarning = styled.div`
  color: var(--color-error-60);
  font-size: var(--font-size-body-5);
  font-weight: 700;
`

// 덮어쓸 저장 폴더 이름 — 어느 폴더가 바뀌는지 확인용이라 눕혀 두고, 난수 이름이 길어
// 줄바꿈 지점이 없으므로 어디서든 끊어 준다.
export const TargetDir = styled.div`
  color: var(--color-neutral-60);
  font-size: var(--font-size-body-5);
  word-break: break-all;
`
