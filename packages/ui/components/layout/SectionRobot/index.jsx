import { StyledSection } from './styles'

const SectionRobot = ({ children, gap, direction }) => {
  return (
    <StyledSection $gap={gap} $direction={direction}>
      <div className="containerRobot">{children}</div>
    </StyledSection>
  )
}

export default SectionRobot
