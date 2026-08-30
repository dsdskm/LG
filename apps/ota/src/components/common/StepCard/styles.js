import { styled } from 'styled-components'

export const CardContainer = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 2.5rem 2rem;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background-color: #ffffff;
  margin-bottom: 1.5rem;

  ${(props) =>
    props.$noPadding &&
    `
    padding: 0;
    min-height: unset;
  `}
`
