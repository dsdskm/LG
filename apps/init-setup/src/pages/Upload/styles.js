import styled from 'styled-components'
import { StyledPageContent } from '@repo/ui'

// init-setup 은 App.jsx 에서 #mainContent 의 padding 을 제거하므로 페이지가 자체 여백을 준다
// (Map/styles.js 의 StyledMapPageContent 와 동일한 규약).
export const StyledUploadPageContent = styled(StyledPageContent)`
  height: 100%;
  padding: 20px;
`

export const FilterRow = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: flex-end;
  flex-wrap: wrap;
`

// 업로드 요약 모달 본문
export const SummaryHeading = styled.p`
  margin-bottom: 1.2rem;
  font-weight: 700;
  color: var(--color-neutral-80);
`

export const SummaryGroup = styled.div`
  margin-bottom: 1.6rem;

  & > .title {
    font-weight: 700;
    margin-bottom: 0.6rem;
    color: var(--color-neutral-80);
  }
`

export const IdList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  list-style: none;

  & > li {
    padding: 0.2rem 0.8rem;
    border: 1px solid var(--color-secondary-20);
    border-radius: var(--radius-sm);
    font-size: 1.2rem;
    color: var(--color-neutral-70);
  }

  & > li.empty {
    border: 0;
    padding: 0;
    color: var(--color-neutral-60);
  }
`

export const ModalButtons = styled.div`
  display: flex;
  gap: 1.6rem;
  justify-content: flex-end;
  margin-top: 2rem;
`

/**
 * 업로드 모달 본문 — 다른 모달(MapOverwriteModal/MapSaveCompleteModal)과 같은 세로 배치 규약.
 * Modal 컴포넌트가 좌우 여백을 주므로 본문에서는 위아래 간격만 다룬다.
 */
export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  width: 100%;
  line-height: 1.5;
`

/** 위치 정보(사이트/빌딩/층/구역) — 라벨 폭을 고정해 값이 세로로 정렬되게 한다. */
export const SummaryList = styled.dl`
  display: grid;
  grid-template-columns: 8rem 1fr;
  row-gap: 0.8rem;
  column-gap: 1.2rem;
  padding: 1.6rem;
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-10);

  & > dt {
    color: var(--color-neutral-60);
  }

  & > dd {
    color: var(--color-neutral-80);
    font-weight: 700;
    word-break: break-all;
  }
`

/** 신규/수정/삭제 POI 개수 — 라벨과 개수를 양끝으로 벌린 행 목록. */
export const CountList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-sm);

  & > li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.2rem 1.6rem;
    color: var(--color-neutral-70);
  }

  & > li + li {
    border-top: 1px solid var(--color-secondary-20);
  }

  & > li > .count {
    font-weight: 700;
    color: var(--color-neutral-80);
  }

  /* 변경분이 없는 항목은 흐리게 — 무엇이 올라가는지 한눈에 구분되게 한다. */
  & > li.zero,
  & > li.zero > .count {
    color: var(--color-neutral-60);
    font-weight: 400;
  }
`

/** 안내/경고 한 줄. tone='warning' 이면 경고색. */
export const ModalNote = styled.p`
  font-size: var(--font-size-body-5);
  color: ${({ $tone }) => ($tone === 'warning' ? 'var(--color-error-60)' : 'var(--color-neutral-60)')};
  word-break: break-all;
`

/** 진행 중 모달 본문 — 스피너 + 안내 문구를 가운데 정렬한다. */
export const ProgressBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  align-items: center;
  justify-content: center;
  min-height: 10rem;
  text-align: center;
  line-height: 1.5;
  width: 100%;

  & > .message {
    color: var(--color-neutral-80);
    font-weight: 700;
  }

  & > .hint {
    font-size: var(--font-size-body-5);
    color: var(--color-neutral-60);
  }
`
