import styled from 'styled-components'

export const StyledGnb = styled.nav`
  height: 100%;
  // padding: 0.5rem;
  background: var(--color-secondary-15);
  display: flex;
  flex-direction: column;
  ${({ $compact }) => !$compact && `overflow-y: auto;`}

  & > ul {
    flex: 1;
  }
`

export const StyledGnbItem = styled.li`
  position: relative;

  &:not(:last-of-type) {
    // margin-bottom: 0.5rem;
  }

  &:hover > .gnbTooltip {
    display: block;
  }

  & & {
    margin: 0.4rem 0 0.4rem 3.8rem;
  }

  & .gnbTooltip & {
    margin: 0.6rem 0;
  }

  @media all and (max-width: 767px) {
    &:not(:last-of-type) {
      margin-bottom: 0.2rem;
    }
  }
`

export const StyledGnbTooltip = styled.div`
  display: none;
  position: absolute;
  width: max-content;
  z-index: 10;
  top: 1.2rem;
  left: 100%;
  padding-left: 2.4rem;

  & .content::before {
    position: absolute;
    top: 0.6rem;
    right: 100%;
    content: '';
    width: 0;
    height: 0;
    border-bottom: 0.6rem solid transparent;
    border-top: 0.6rem solid transparent;
    border-left: 0.8rem solid transparent;
    border-right: 0.8rem solid var(--color-secondary-80);
  }

  & .content {
    position: relative;
    min-width: 15.4rem;
    border-radius: var(--radius-xs);
    background: var(--color-secondary-80);
    padding: 1.2rem 0.8rem 0.6rem;
    color: var(--color-neutral-10);

    & .tooltipTitle {
      display: block;
      padding: 0 0.4rem 0.6rem;
      color: var(--color-neutral-10);
    }

    & .gnbList {
      border-top: 1px solid var(--alpha-white-15);
      color: var(--color-neutral-10);
    }
  }
`
