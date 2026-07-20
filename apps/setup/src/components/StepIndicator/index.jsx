import React, { useEffect, useState } from 'react'
import { StyledStepIndicator, StepItem, StepCircle, StepLine } from './styles'
import { Section, Title } from '@repo/ui'

const StepIndicator = ({ steps, currentStep }) => {
  const [curStep, setCurStep] = useState(0)
  useEffect(() => {
    setCurStep(currentStep)
  }, [currentStep])
  return (
    <>
      <StyledStepIndicator>
        {steps.map((step, index) => {
          const active = index === curStep
          const completed = index < curStep
          const isLast = index === steps.length - 1

          return (
            <StepItem key={index} $isLast={isLast} onClick={() => setCurStep(index)}>
              <StepCircle $active={active} $completed={completed}>
                {completed ? '✓' : index + 1}
              </StepCircle>
              {!isLast && <StepLine $completed={completed} />}
            </StepItem>
          )
        })}
      </StyledStepIndicator>
      <Section>
        <Title>{steps[curStep]}</Title>
      </Section>
    </>
  )
}

export default StepIndicator
