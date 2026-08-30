import React from 'react'
import { ProgressBarWrapper, ProgressTrack, ProgressFill, ProgressText, ProgressPercentage } from './styles'

const ProgressBar = ({ percentage = 0, showPercentage = false, status = '', className }) => {
  const safePercentage = Math.min(Math.max(percentage, 0), 100)

  return (
    <ProgressBarWrapper className={className}>
      <ProgressTrack>
        <ProgressFill $percentage={safePercentage} />
        {status && <ProgressText $status={status}>{status}</ProgressText>}
        {showPercentage && <ProgressPercentage>{safePercentage}%</ProgressPercentage>}
      </ProgressTrack>
    </ProgressBarWrapper>
  )
}

export default ProgressBar
