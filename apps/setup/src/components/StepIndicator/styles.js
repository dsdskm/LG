import styled from 'styled-components'

export const StyledStepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem 0;
`

export const StepItem = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  flex: ${(props) => (props.$isLast ? '0 0 auto' : '1')};
`

export const StepCircle = styled.div`
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-body-5);
  font-weight: 600;
  z-index: 1;
  transition: all 0.3s ease;

  background-color: ${(props) =>
    props.$active || props.$completed ? 'var(--color-primary-60)' : 'var(--color-neutral-20)'};
  color: ${(props) => (props.$active || props.$completed ? 'var(--color-neutral-10)' : 'var(--color-neutral-50)')};
  border: 0.2rem solid ${(props) => (props.$active ? 'var(--color-primary-60)' : 'transparent')};

  ${(props) =>
    props.$active &&
    `
    box-shadow: 0 0 0 0.4rem var(--color-primary-20);
  `}
`

export const StepLabel = styled.div`
  position: absolute;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: var(--font-size-body-6);
  font-weight: ${(props) => (props.$active ? '600' : '400')};
  color: ${(props) => (props.$active ? 'var(--color-neutral-90)' : 'var(--color-neutral-50)')};
`

export const StepLine = styled.div`
  flex: 1;
  height: 0.2rem;
  background-color: ${(props) => (props.$completed ? 'var(--color-primary-60)' : 'var(--color-neutral-20)')};
  margin: 0 0.8rem;
  transition: background-color 0.3s ease;
`
