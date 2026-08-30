import styled from 'styled-components'

export const GroupWrapper = styled.div``

export const DropdownContainer = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
`

// 생성 마법사 헤더 : 상세/생성 화면 공용 헤더와 동일
export { DetailHead as WizardHead } from '@/components/common/styles'

// 2단계 진행 표시 : 원(번호/체크) + 제목 + 설명, 사이는 연결선
export const StepIndicator = styled.nav`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2.4rem;
  width: 100%;
  margin-bottom: 2.4rem;

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    max-width: 32rem;
    padding: 0;
    border: 0;
    background: none;
    text-align: center;
    cursor: pointer;

    &:disabled {
      cursor: default;
    }
  }

  .circle {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    background: var(--color-secondary-40);
    color: var(--color-neutral-10);
    font-weight: 600;
  }

  .step.active .circle,
  .step.done .circle {
    background: var(--color-neutral-90);
  }

  .stepTitle {
    font-weight: 600;
    color: var(--color-neutral-90);
  }

  .stepDesc {
    color: var(--color-secondary-60);
  }

  .connector {
    flex: 0 1 12rem;
    height: 1px;
    margin-top: 1.6rem;
    background: var(--color-secondary-30);
  }

  @media all and (max-width: 767px) {
    .connector {
      display: none;
    }
  }
`

export const WizardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
`

// 카드 헤더 : 제목 + 선택 개수 배지
export const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.9rem;

  .countBadge {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-width: 3.2rem;
    height: 2.2rem;
    padding: 0 0.8rem;
    border-radius: 1.1rem;
    background: var(--color-neutral-90);
    color: var(--color-neutral-10);
    font-size: var(--font-size-body-6);
    font-weight: 600;
  }
`

// 조회 화면에서 선택 방식(Static/Dynamic)을 읽기 전용으로 보여주는 영역
export const ModeSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  .modeHead {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .modeSubtitle,
  .modeDesc {
    color: var(--color-secondary-60);
  }
`

export const RobotFilterRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 1.2rem;
  width: 100%;
`

export const SelectionTypeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  // margin: 2.4rem 1rem 0 1rem;

  label {
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 2.4rem;
    letter-spacing: 0;
    color: #000;
  }

  .selection-cards {
    display: flex;
    gap: 2rem;
  }

  ${(props) =>
    props.disabled &&
    `
    opacity: 0.5;
    pointer-events: none;
    button {
      cursor: not-allowed;
    }
  `}
`

export const SelectionItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.6rem;
  padding: 2rem;
  border: 1px solid var(--color-secondary-30);
  border-radius: 1.2rem;
  background: var(--color-neutral-10);
`

export const SelectionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2.4rem;
  align-items: stretch;

  ${SelectionItemContainer} {
    flex: 1;
    min-width: 28rem;
  }
`

export const VersionContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 0.8rem;
  min-height: 3.2rem;
`

export const DeviceToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }

  .toolbar-title {
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--color-neutral-90);
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }

  .clear-all {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1.4rem;
    color: var(--color-primary-50);

    &:disabled {
      color: var(--color-neutral-40);
      cursor: not-allowed;
    }
  }
`

export const ModalFilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  min-width: 60rem;
`

export const ModalSelectionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.2rem 1.6rem;
  border-radius: 0.8rem;
  background: var(--color-neutral-10);
  font-size: 1.4rem;
  color: var(--color-neutral-90);

  strong {
    font-weight: 700;
  }

  .select-all {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-primary-50);
  }
`
