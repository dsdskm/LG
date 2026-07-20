import { Link } from 'react-router-dom'
import { StyledGuideButton } from './styles'

const GuideButton = ({ children, href, ...rest }) => {
  return (
    <StyledGuideButton as={href ? Link : 'button'} to={href || null} {...rest}>
      {children}
    </StyledGuideButton>
  )
}

export default GuideButton
