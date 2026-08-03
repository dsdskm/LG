import styled from 'styled-components'

export const PreviewCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  background: #f7f7f8;
`

export const PreviewHeaderTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
`

export const MediaStage = styled.div`
  min-height: 156px;
  border-radius: 12px;
  background: #ececef;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`
export const MediaFallbackText = styled.div`
  font-size: 20px;
  font-weight: 500;
  color: #111111;
  line-height: 1;
`

export const AudioControlGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`

export const AudioControlButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    border-color: #e5e7eb;
    cursor: not-allowed;
    opacity: 0.6;
  }
`
