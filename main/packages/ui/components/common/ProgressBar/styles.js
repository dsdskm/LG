import styled from 'styled-components'

export const ProgressBarWrapper = styled.div`
  display: flex;
  gap: 0.8rem;
  width: 100%;
  flex-direction: row;
  align-items: center;
`

export const ProgressTrack = styled.div`
  background-color: var(--color-neutral-20);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  flex: 1;
  height: 1.6rem;
  width: 100%;
`

export const ProgressFill = styled.div`
  background-color: var(--color-primary-70);
  border-radius: var(--radius-sm);
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  transition: width 0.3s ease-in-out;
`

export const ProgressText = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.1rem;
  color: var(--color-neutral-10);
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.8),
    1px -1px 0 rgba(0, 0, 0, 0.8),
    -1px 1px 0 rgba(0, 0, 0, 0.8),
    1px 1px 0 rgba(0, 0, 0, 0.8);
`

export const ProgressPercentage = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.1rem;
  color: var(--color-neutral-10);
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.8),
    1px -1px 0 rgba(0, 0, 0, 0.8),
    -1px 1px 0 rgba(0, 0, 0, 0.8),
    1px 1px 0 rgba(0, 0, 0, 0.8);
`
