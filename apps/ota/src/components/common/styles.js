import styled, { keyframes, css } from 'styled-components'

export const DropdownContainer = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;

  @media all and (min-width: 1580px) {
    width: 90%;
    margin: 0 auto 2rem auto;
  }
`

export const ButtonWrap = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  &.alignLeft {
    justify-content: flex-start;
  }

  &.alignRight {
    justify-content: flex-end;
  }

  &.alignCenter {
    justify-content: center;
  }
`

export const PageHeadWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  margin: 0 auto 2rem auto;

  & > div:first-child {
    font-weight: bold;
  }

  ${ButtonWrap} {
    margin: 0;
  }
  @media all and (min-width: 1580px) {
    width: 90%;
  }
`

export const slideDown = keyframes`
  from {
    opacity: 0;
    margin-top: -1.0rem;
  }
  to {
    opacity: 1;
    margin-top: 0;
  }
`

export const slideUp = keyframes`
  from {
    opacity: 1;
    margin-top: 0;
  }
  to {
    opacity: 0;
    margin-top: -1.0rem;
  }
`

export const StyledExpandedWrapper = styled.div`
  animation: ${({ $isClosing, $inModal }) =>
    $inModal
      ? 'none'
      : css`
          ${$isClosing ? slideUp : slideDown} 0.2s ease-out forwards
        `};
  overflow: hidden;
  padding: ${({ $inModal }) => ($inModal ? '0' : '1rem')};
  height: fit-content;
  background-color: ${({ $inModal }) => ($inModal ? 'transparent' : 'var(--color-neutral-30)')};
  border-radius: 0.5rem;
`
