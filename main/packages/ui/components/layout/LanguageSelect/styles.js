import styled from 'styled-components'
import { mobileHeaderButtonStyle } from '@repo/ui/styles'

export const StyledLanguageSelect = styled.div`
  position: relative;

  & .languageOption {
    position: absolute;
    min-width: 18rem;
    max-height: 17.6rem;
    top: calc(100% + 0.2rem);
    right: 0;
    background: var(--color-neutral-10);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-03);
    overflow-y: auto;
  }

  & .selectButton {
    display: flex;
    gap: 0.4rem;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 1.2rem 1.6rem;

    &:hover {
      background: var(--color-secondary-15);
    }

    & .label {
      flex-grow: 1;
      text-align: left;
    }
  }

  @media all and (max-width: 767px) {
    ${mobileHeaderButtonStyle};
    bottom: 7.6rem;

    & .languageOption {
      top: -18rem;
    }
  }
`
