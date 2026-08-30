import styled from 'styled-components'

export const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  align-items: center;
`

export const StyledPreviewBox = styled.div`
  border: 1px solid var(--color-secondary-20);
  padding: 1rem;
  border-radius: 8px;
  background: #fff;
  max-height: 600px;
  width: max-content;
  display: flex;
  // justify-content: center;
  align-items: center;
  overflow: hidden;
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.06);
`

export const TableContent = styled.div`
  margin-top: 1rem;
`

export const DropdownContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`
