import { StyledStatusTag } from './styles'

const StyledTag = ({ color, bgColor, children }) => {
  return (
    <StyledStatusTag $color={color} $bgColor={bgColor}>
      {children}
    </StyledStatusTag>
  )
}

export default StyledTag
