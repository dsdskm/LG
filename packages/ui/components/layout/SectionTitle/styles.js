import styled from 'styled-components'

export const StyledSectionTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 1.9rem;

  & .sectionTitleSub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
  }

  @media all and (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.2rem;
  }
`
