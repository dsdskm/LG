import styled from 'styled-components'

export const StyledCalendarContainer = styled.div`
  & > .react-datepicker-wrapper {
    display: flex;
  }

  & .react-datepicker-popper {
    position: fixed !important;
  }

  & .react-datepicker {
    width: 100%;
    border: 0;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-03);

    ${({ $timestamp }) =>
      $timestamp &&
      `
    position: relative;
    padding-bottom: 20px;
  `}

    & > .react-datepicker__triangle {
      display: none;
    }

    & .react-datepicker__month-container {
      width: 100%;

      & .react-datepicker__header {
        padding: 0 2.4rem;
        background-color: var(--color-neutral-10);
        border-bottom: 0;

        &:not(.react-datepicker__header--has-time-select) {
          border-top-left-radius: var(--radius-md) !important;
          border-top-right-radius: var(--radius-md) !important;
        }

        // 요일
      }

      & .react-datepicker__month {
        margin: 0;
        padding: 0 2rem 2rem 2rem;

        // 요일, 날짜 : 일요일 커스텀
        & .react-datepicker__day:nth-child(1),
        & .react-datepicker__day-name:nth-child(1) {
          color: var(--color-error-70);
        }

        &.react-datepicker__monthPicker {
          margin-top: 2rem;

          & .react-datepicker__month-wrapper {
            & + .react-datepicker__month-wrapper {
              margin-top: 0.8rem;
            }

            & .react-datepicker__month-text {
              width: 10.4rem;
              height: 6.6rem;
              line-height: 6.4rem;
              margin: 0;
              border-radius: var(--radius-md);
              font-size: var(--font-size-body-4);

              &:hover {
                text-decoration: underline;
                background-color: var(--color-secondary-10);
              }

              & + .react-datepicker__month-text {
                margin-left: 0.8rem;
              }

              &.react-datepicker__month-text--keyboard-selected {
                background-color: var(--color-secondary-10);
              }

              &.react-datepicker__month-text--selected {
                background-color: var(--color-secondary-80);
                color: var(--color-neutral-10);
              }

              &.react-datepicker__month-text--selected:hover,
              &.react-datepicker__month-text--keyboard-selected:hover {
                background-color: var(--color-secondary-90);
                text-decoration: underline;
                color: var(--color-neutral-10);
              }
            }
          }
        }

        & .react-datepicker__week {
          & .react-datepicker__day--in-range {
            &:not(.react-datepicker__day--selected, .react-datepicker__day--today, .react-datepicker__day--range-end) {
              background-color: var(--color-secondary-10);
              color: var(--color-neutral-80);
            }
          }

          & .react-datepicker__day--in-selecting-range {
            &:not(
              .react-datepicker__day--selected,
              .react-datepicker_day--in-range,
              .react-datepicker__month-text--in-range,
              .react-datepicker__quarter-text--in-range,
              .react-datepicker_year-text--in-range
            ) {
              background-color: var(--color-secondary-10);
              color: var(--color-neutral-80);
            }
          }
        }

        // 날짜
        & .react-datepicker__day {
          width: 4rem;
          height: 4rem;
          line-height: 3.8rem;
          margin: 0.4rem;
          font-size: var(--font-size-body-5);
          border-radius: 9999px;

          &:hover {
            background-color: var(--color-secondary-10);
            text-decoration: underline;
          }

          &.react-datepicker__day--today {
            border: 1px solid var(--color-secondary-80);
            background-color: var(--color-secondary-10);
            color: var(--color-neutral-90);

            &:hover {
              text-decoration: underline;
              background-color: var(--color-secondary-10);
            }
          }

          &.react-datepicker__day--keyboard-selected {
            background-color: transparent;
          }

          &.react-datepicker__day--selected,
          &.react-datepicker__day--today,
          &.react-datepicker__day--selected:hover,
          &.react-datepicker__day--today:hover,
          &.react-datepicker__day:hover {
            border-radius: 9999px;
          }

          &.react-datepicker__day--selected,
          &.react-datepicker__day--range-end {
            background-color: var(--color-secondary-80);
            color: var(--color-neutral-10);
          }

          &.react-datepicker__day--selected:hover,
          &.react-datepicker__day--keyboard-selected:hover,
          &.react-datepicker__day--range-end:hover {
            background-color: var(--color-secondary-90);
            color: var(--color-neutral-10);
          }
        }
      }
    }
  }

  @media all and (max-width: 1580px) {
    min-width: auto;
  }

  @media all and (max-width: 640px) {
    & .react-datepicker {
      & .react-datepicker__month-container {
        & .react-datepicker__header {
          padding: 0.8rem;
          padding: 0.8rem;
        }
        & .react-datepicker__month {
          padding: 0 1rem 1rem 1rem;
          & .react-datepicker__day {
            width: 2.8rem;
            height: 2.8rem;
            line-height: 2.6rem;
          }
        }
      }
    }
  }

  /* 요일 스타일 명시도 강화 (Flattened & Double Specificity) */
  && .react-datepicker__day-names {
    display: flex !important;
    justify-content: center !important;
    margin-top: 2rem !important;
    margin-bottom: 1.6rem !important;
  }

  && .react-datepicker__day-name {
    width: 4.8rem !important;
    font-size: var(--font-size-body-5) !important;
    line-height: var(--line-height-body-5) !important;
    font-weight: 700 !important;
    text-align: center !important;
    margin: 0 !important;
  }

  @media all and (max-width: 640px) {
    && .react-datepicker__day-names {
      margin-top: 1rem !important;
      margin-bottom: 0.8rem !important;
    }
    && .react-datepicker__day-name {
      width: 3.6rem !important;
    }
  }

  /* 선택/오늘 날짜 스타일 명시도 강화 (Flattened & Double Specificity) */
  && .react-datepicker__day--selected,
  && .react-datepicker__day--today,
  && .react-datepicker__day--range-end,
  && .react-datepicker__day--in-range,
  && .react-datepicker__day--in-selecting-range {
    border-radius: 9999px !important;
  }

  && .react-datepicker__day--selected,
  && .react-datepicker__day--range-end {
    background-color: var(--color-secondary-80) !important;
    color: var(--color-neutral-10) !important;

    &:hover {
      background-color: var(--color-secondary-90) !important;
    }
  }

  && .react-datepicker__day--today {
    border: 1px solid var(--color-secondary-80) !important;
    background-color: var(--color-secondary-10) !important;
    color: var(--color-neutral-90) !important;
  }

  && .react-datepicker__day--in-range,
  && .react-datepicker__day--in-selecting-range {
    &:not(.react-datepicker__day--selected, .react-datepicker__day--today, .react-datepicker__day--range-end) {
      background-color: var(--color-secondary-10) !important;
      color: var(--color-neutral-80) !important;
    }
  }
  && .rp-disabled,
  && .react-datepicker__day--disabled {
    color: var(--color-neutral-40) !important;
    background: transparent !important;
    border: 0 !important;
    text-decoration: none !important;
    pointer-events: none;
    cursor: default !important;
  }

  /* 오늘(today)인 경우에도 disabled가 더 우선하도록 강제 */
  && .rp-disabled.react-datepicker__day--today,
  && .react-datepicker__day--disabled.react-datepicker__day--today {
    color: var(--color-neutral-40) !important;
    background: transparent !important;
    border: 0 !important;
  }

  /* 일요일 커스텀(빨간색)보다 disabled가 더 우선 */
  && .rp-disabled,
  && .react-datepicker__day--disabled {
    -webkit-text-fill-color: var(--color-neutral-40) !important;
  }

  /* 허용된 날짜는 기존 hover 스타일을 유지(또는 살짝 강조) */
  && .rp-allowed:hover {
    background-color: var(--color-secondary-10) !important;
    text-decoration: underline;
  }

  /* 키보드 focus 시에도 disabled가 활성처럼 보이지 않도록 */
  && .rp-disabled.react-datepicker__day--keyboard-selected,
  && .react-datepicker__day--disabled.react-datepicker__day--keyboard-selected {
    background: transparent !important;
    color: var(--color-neutral-40) !important;
  }
`

export const StyledCalendarInputWrap = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0 1rem;
  min-height: 3.6rem;
  padding: 0 1.2rem;
  border-radius: var(--radius-sm);
  border: 1px solid ${({ $isActive }) => ($isActive ? 'var(--color-secondary-80)' : 'var(--color-secondary-20)')};
  background-color: var(--color-neutral-10);
  outline: ${({ $isActive }) => ($isActive ? '2px solid var(--color-secondary-80)' : 'none')};
  outline-offset: -2px;
  opacity: ${({ $isDisabled }) => ($isDisabled ? '0.4' : '1')};

  &:hover {
    background-color: ${({ $isDisabled }) => ($isDisabled ? 'transparent' : 'var(--color-secondary-10)')};
  }

  & > input {
    flex: 1;
    width: 100%;
    border: 0;
    outline: none;
    background-color: transparent;
    color: ${({ $isActive }) => ($isActive ? 'var(--color-neutral-80)' : 'var(--color-neutral-60)')};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover > input:not(:disabled) {
    text-decoration-line: underline;
  }

  & > svg {
    flex-shrink: 0;
  }
`

export const StyledCalendarHeaderWrap = styled.div`
  display: flex;
  align-items: center;
  padding-top: 2.8rem;
  padding-bottom: 0.8rem;

  & .dropdownWrap {
    position: relative;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }

    & .dropdownArea {
      & .dropdownText {
        display: flex;
        gap: 0 0.4rem;
      }
    }

    & .dropdownOptionList {
      position: absolute;
      top: calc(100% + 1rem);
      left: 0;
      display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
      width: 13.8rem;
      max-height: 30rem;
      border-radius: var(--radius-md);
      background-color: var(--color-neutral-10);
      box-shadow: var(--shadow-03);
      overflow-y: auto;

      & > li {
        & > button {
          width: 100%;
          padding: 1.2rem;

          &:hover {
            background-color: var(--color-secondary-15);
          }

          &.selected {
            background-color: var(--color-secondary-15);
          }
        }
      }
    }
  }

  & .calendarBtnGroup {
    display: flex;
    align-items: center;
    margin-left: auto;

    & > button {
      display: flex;

      &.calendarNextBtn {
        margin-left: 2rem;
      }
    }
  }

  @media all and (max-width: 640px) {
    padding-top: 1.4rem;
    padding-bottom: 0.8rem;
  }
`

export const StyledCalendarBtnGroup = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`
