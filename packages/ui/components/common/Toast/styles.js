import styled from 'styled-components'
import { ToastContainer } from 'react-toastify'

export const StyledToast = styled(ToastContainer)`
  &&&.Toastify__toast-container {
    bottom: 11rem;
    padding: 2.4rem;
  }
  .Toastify__toast {
    min-height: 4.4rem;
    padding: 1.2rem 2.4rem;
    border-radius: var(--radius-xs);
    background-color: var(--color-neutral-80);
    font-size: var(--font-size-heading-6);
    line-height: var(--line-height-body-6);
    color: var(--color-neutral-15);
    text-align: center;
    box-shadow: var(--shadow-01);
  }
  .Toastify__toast-body {
    padding: 0;
  }

  @media all and (max-width: 480px) {
    &&&.Toastify__toast-container {
      bottom: 0;
    }

    .Toastify__toast {
      margin-bottom: 1rem;
    }
  }
`
