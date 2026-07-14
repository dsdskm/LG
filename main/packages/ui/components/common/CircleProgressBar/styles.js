import styled from 'styled-components'

export const ProgressBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.$size}px;
`

export const SvgContainer = styled.svg`
  transform: rotate(-90deg);
  overflow: visible;
`

export const BackgroundCircle = styled.circle`
  fill: transparent;
  stroke: var(--color-neutral-30, #e0e0e0);
`

export const ForegroundCircle = styled.circle`
  fill: transparent;
  stroke: var(--color-primary-50, #2563eb);
  stroke-dasharray: ${(props) => props.$circumference};
  stroke-dashoffset: ${(props) => props.$offset};
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease-in-out;
`

export const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 5px;
  gap: 4px;
`

export const ProgressText = styled.span`
  font-size: 10px;
  color: var(--color-neutral-60, #666);
`

export const ProgressPercentage = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-90, #111);
`
