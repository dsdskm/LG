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
