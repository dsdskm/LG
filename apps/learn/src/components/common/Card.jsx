import styled from 'styled-components'

const Card = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 12px;
  padding: ${({ padding }) => padding || '20px'};
  transition: box-shadow 0.2s;

  ${({ hoverable }) =>
    hoverable &&
    `
    cursor: pointer;
    &:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
  `}
`

export default Card
