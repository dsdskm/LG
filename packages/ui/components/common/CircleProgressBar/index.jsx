import React from 'react'
import {
  ProgressBarWrapper,
  SvgContainer,
  BackgroundCircle,
  ForegroundCircle,
  TextContainer,
  ProgressText,
  ProgressPercentage
} from './styles'

const CircleProgressBar = ({
  percentage = 0,
  showPercentage = true,
  status = '',
  className,
  size = 30,
  strokeWidth = 5
}) => {
  const safePercentage = Math.min(Math.max(percentage, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (safePercentage / 100) * circumference

  return (
    <ProgressBarWrapper className={className}>
      <SvgContainer width={size} height={size}>
        <BackgroundCircle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <ForegroundCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          $circumference={circumference}
          $offset={offset}
        />
      </SvgContainer>

      <TextContainer>
        {status && <ProgressText $status={status}>{status}</ProgressText>}
        {showPercentage && <ProgressPercentage>{safePercentage}%</ProgressPercentage>}
      </TextContainer>
    </ProgressBarWrapper>
  )
}

export default CircleProgressBar
