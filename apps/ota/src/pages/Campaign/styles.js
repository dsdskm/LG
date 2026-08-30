import styled from 'styled-components'

export const DropdownContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 2rem;
`

// 상세 화면 카드 그리드 : 상단(캠페인 정보 / 업데이트 상태), 하단(타겟 그룹 / 아티팩트 / 롤아웃 설정)
export const DetailCardRow = styled.div`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns || '1fr'};
  align-items: stretch;
  gap: 2rem;
  width: 100%;
  margin-bottom: 2rem;

  @media all and (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
`

// label - value 형태의 읽기 전용 정보 목록
export const InfoList = styled.dl`
  display: grid;
  grid-template-columns: minmax(10rem, auto) 1fr;
  align-items: center;
  row-gap: 1.2rem;
  column-gap: 1.6rem;
  width: 100%;

  & > dt {
    color: var(--color-secondary-60);
  }

  & > dd {
    color: var(--color-neutral-80);
    font-weight: 600;
    word-break: break-all;
  }

  & .failedCount {
    margin-left: 0.4rem;
    color: var(--color-error-60);
    font-weight: 500;
  }
`

// 아티팩트 선택 필드 : 읽기 전용 입력 + 우측 검색 아이콘(클릭 시 선택 모달)
export const PickerField = styled.div`
  width: 100%;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};

  & input {
    cursor: inherit;
  }

  & .unit {
    display: inline-flex;
    align-items: center;
    color: var(--color-secondary-80);
  }
`

// 아티팩트 선택 모달 본문 : 필터 영역과 테이블 사이 간격 확보
export const ArtifactPickerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  width: 100%;
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  width: 100%;
`

export const StateStatusList = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  width: 100%;
  margin: 0 0 2.4rem;
`
