import styled from 'styled-components'

export const StyledNoData = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  gap: 1rem;
  width: 100%;
  padding: 5rem 0;
  color: var(--color-secondary-30, #c0c4cc);

  p {
    font-size: 1.3rem;
    color: var(--color-secondary-40, #adb5bd);
    text-align: center;
    white-space: pre-line;
    line-height: 1.5;
  }
`
