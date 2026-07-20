import styled from 'styled-components'

export const StyledSection = styled.section`
  width: 100%;
  flex: 1;
  background: var(--color-neutral-10);
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-00);

  & > .container,
  & > .containerRobot {
    display: flex;
    flex-direction: ${({ $direction }) => $direction || 'column'};
    height: 100%;
    padding: 1.9rem 2.4rem;
    gap: ${({ $gap }) => $gap || '0'};

    & > .content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  }
  @media all and (min-width: 1580px) {
    width: 90%;
    margin: 0 auto;

    section & {
      width: 100%;
      margin: 0;
    }
  }
`
