import Icon from '../Icon'
import { StyledIconButton, StyledIconLink } from './styles'

const getIconSize = (size) => {
  switch (size) {
    case 'lg':
      return 32
    case 'md':
      return 24
    case 'sm':
      return 18
    case 'xs':
      return 16
    default:
      return null
  }
}

const components = {
  button: StyledIconButton,
  Link: StyledIconLink
}

const IconButton = ({ as = 'button', size = 'md', theme = 'outlined', shape = 'round', name, children, ...rest }) => {
  const iconSize = getIconSize(size)
  const Component = components[as] || StyledIconButton

  return (
    <Component $size={size} $theme={theme} $shape={shape} {...rest}>
      {name && <span className="label">{name}</span>}
      {children || <Icon name={name} size={iconSize} />}
    </Component>
  )
}

export default IconButton
