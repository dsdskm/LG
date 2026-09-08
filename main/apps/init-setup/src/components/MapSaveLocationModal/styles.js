import styled from 'styled-components'

// Modal 본문 — 안내 문구 / 위치 선택 UI(children) / 맵 이름 미리보기를 위에서 아래로 쌓는다.
// Modal 이 본문 폭을 자식에게 넘기므로 width: 100% 로 받아 둔다.
export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  line-height: 1.5;
  width: 100%;
`

// 확정될 맵 이름 미리보기 줄. 이름이 길어 한 줄을 넘기면 라벨과 값이 따로 흐르도록 wrap 을 둔다.
export const NamePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`

export const PreviewLabel = styled.span`
  color: var(--color-neutral-60);
  font-size: var(--font-size-body-5);
`

// [Building]_[Floor]_[Area] 로 이어 붙인 이름이라 길고 줄바꿈 지점이 없어 어디서든 끊어 준다.
export const PreviewValue = styled.strong`
  color: var(--color-neutral-80);
  font-size: var(--font-size-body-5);
  font-weight: 700;
  word-break: break-all;
`
