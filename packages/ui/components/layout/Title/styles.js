import styled from 'styled-components'

export const StyledTitle = styled.div`
  & .title {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-height: 3.6rem;
    margin-bottom: 0.8rem;
  }

  & .info {
    min-height: var(--line-height-body-3);
  }
`
