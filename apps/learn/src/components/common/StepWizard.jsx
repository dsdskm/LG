import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  &:last-child {
    flex: 0;
  }
`

const StepCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({ $active, $done }) => ($done ? '#51CF66' : $active ? '#4A90D9' : 'var(--color-neutral-10, #fff)')};
  color: ${({ $active, $done }) => ($done || $active ? '#fff' : 'var(--color-secondary-50, #848c9d)')};
  border: 2px solid
    ${({ $active, $done }) => ($done ? '#51CF66' : $active ? '#4A90D9' : 'var(--color-secondary-20, #dadde2)')};
`

const StepLabel = styled.span`
  font-size: 13px;
  color: ${({ $active }) => ($active ? 'var(--color-secondary-90, #262f44)' : 'var(--color-secondary-50, #848c9d)')};
  font-weight: ${({ $active }) => ($active ? '600' : '400')};
  white-space: nowrap;
`

const StepConnector = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ $done }) => ($done ? '#51CF66' : 'var(--color-secondary-20, #dadde2)')};
  margin: 0 8px;
`

const StepContent = styled.div`
  padding: 8px 0;
`

const NavButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--color-secondary-20, #dadde2);
`

const Btn = styled.button`
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ $primary }) => ($primary ? 'var(--color-primary-60, #2f929f)' : 'var(--color-neutral-10, #fff)')};
  color: ${({ $primary }) => ($primary ? '#fff' : 'var(--color-secondary-70, #555e72)')};
  border: ${({ $primary }) => ($primary ? 'none' : '1px solid var(--color-secondary-30, #c1c6cf)')};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`

export default function StepWizard({ steps, currentStep, onNext, onBack, children, nextLabel, nextDisabled }) {
  const { t } = useTranslation('learn')
  return (
    <Wrapper>
      <StepHeader>
        {steps.map((step, idx) => (
          <StepItem key={idx}>
            <StepCircle $active={idx === currentStep} $done={idx < currentStep}>
              {idx < currentStep ? '✓' : idx + 1}
            </StepCircle>
            <StepLabel $active={idx === currentStep}>{step}</StepLabel>
            {idx < steps.length - 1 && <StepConnector $done={idx < currentStep} />}
          </StepItem>
        ))}
      </StepHeader>

      <StepContent>{children}</StepContent>

      <NavButtons>
        {currentStep > 0 && <Btn onClick={onBack}>{t('stepWizard.prev')}</Btn>}
        {currentStep < steps.length - 1 && (
          <Btn $primary onClick={onNext} disabled={nextDisabled}>
            {nextLabel || t('stepWizard.next')}
          </Btn>
        )}
      </NavButtons>
    </Wrapper>
  )
}
