import styled from 'styled-components'

export const SectionTitle = styled.div`
  margin-top: 2px;
  font-size: 13px;
  font-weight: 800;
  color: #374151;
  letter-spacing: 0.04em;
`

export const PreviewContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const PreviewProgressTitle = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: #374151;
  letter-spacing: 0.04em;
`

export const PreviewProgressTrack = styled.div<{ $trackWidth: number }>`
  width: ${({ $trackWidth }) => $trackWidth}%;
  height: 8px;
  background: #d1d5db;
  border-radius: 4px;
  overflow: hidden;
`

export const PreviewProgressFill = styled.div<{ $fillPercent: number }>`
  width: ${({ $fillPercent }) => $fillPercent}%;
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
  // transition: width 0.3s ease;
`
/* Task row button */
export const PreviewToggleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 8px 1px; /* px-3 py-2 */
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:hover {
    background: #f8fafc; /* slate-50 */
  }
`

export const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  color: #64748b; /* slate-500 */
  transition: transform 140ms ease;

  transform: ${({ $open }) => ($open ? 'rotate(90deg)' : 'rotate(0deg)')};
`
