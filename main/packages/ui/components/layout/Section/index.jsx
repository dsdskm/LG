import { StyledSection } from './styles'

const Section = ({ children, gap, direction }) => {
  return (
    <StyledSection $gap={gap} $direction={direction}>
      <div className="container">{children}</div>
    </StyledSection>
  )
}

export default Section
