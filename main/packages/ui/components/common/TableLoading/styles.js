import styled, { keyframes } from 'styled-components'

export const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
`

export const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--color-neutral-10, #f9f9f9);
  border-radius: 12px;
  border: 1px solid var(--color-neutral-30, #eee);
  margin: 2rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
`

export const SpinnerContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const PulseRing = styled.div`
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-primary-20, rgba(54, 215, 183, 0.2));
  animation: ${pulse} 2s infinite ease-in-out;
`

export const LoadingText = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-80, #333);
  letter-spacing: 0.05em;
  text-transform: uppercase;
`
