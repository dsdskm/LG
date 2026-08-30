import { StyledSectionTitle } from './styles'

const SectionTitle = ({ title, children }) => {
  return (
    <StyledSectionTitle className="title">
      <h3 className="typographyHeading3">{title}</h3>
      {children && <div className="sectionTitleSub">{children}</div>}
    </StyledSectionTitle>
  )
}

export default SectionTitle
