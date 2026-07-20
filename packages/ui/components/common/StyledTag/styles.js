import styled from 'styled-components'

export const StyledStatusTag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  text-transform: capitalize;
  transition:
    background-color 0.4s ease-in-out,
    color 0.4s ease-in-out;
  color: ${({ $color = '#5f6368' }) => $color};
  background-color: ${({ $bgColor = '#f1f3f4' }) => $bgColor};

  &:not(:last-child) {
    margin-right: 3px;
  }
`
