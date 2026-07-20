import React from 'react'
import { StyledPageContent } from './styles'
import StepIndicator from '../../components/StepIndicator'

const DrivingSetup = () => {
  return (
    <StyledPageContent>
      <StepIndicator steps={['Step 1', 'Step 2', 'Step 3']} currentStep={0} />
    </StyledPageContent>
  )
}

export default DrivingSetup
