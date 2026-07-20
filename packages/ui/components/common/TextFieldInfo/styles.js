import styled from 'styled-components'

export const StyledTextFieldInfo = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 1.6rem;
  color: var(--color-${({ $error }) => ($error ? 'error-70' : 'neutral-70')});

  .message {
    flex-grow: 1;
  }
`
