import styled from 'styled-components'

export const StyledFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 4rem;

  @media all and (max-width: 767px) {
    justify-content: center;
    padding: 1rem 1.6rem;
    height: auto;
  }
`

export const StyledFnb = styled.nav`
  display: flex;
  align-items: center;

  & .fnbList,
  & .fnbItem {
    display: flex;
    align-items: center;

    & > .active {
      font-weight: 700;
    }
  }

  & .fnbItem:not(:last-of-type)::after {
    content: '';
    margin: 0 0.4rem;
    width: 0.1rem;
    height: 1.2rem;
    background: var(--alpha-black-10);
  }

  @media all and (max-width: 767px) {
    width: 100%;

    & .fnbList {
      width: 100%;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem 0;
    }
  }
`
