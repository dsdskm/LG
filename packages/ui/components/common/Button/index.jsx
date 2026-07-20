import { forwardRef } from 'react'
import { StyledAnchor, StyledButton, StyledLink, StyledNavLink } from './styles'

const getTypographyClass = (size) => {
  switch (size) {
    case 'lg':
      return 'typographyButton3'
    case 'md':
      return 'typographyButton4'
    case 'sm':
      return 'typographyButton5'
    default:
      return null
  }
}

const components = {
  button: StyledButton,
  a: StyledAnchor,
  Link: StyledLink,
  NavLink: StyledNavLink
}

/**
 * Common Button component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {'button' | 'a' | 'Link' | 'NavLink'} [props.as='button'] - HTML element or component to render as
 * @param {'lg' | 'md' | 'sm'} [props.size='md'] - Button size
 * @param {'primary' | 'secondary' | 'tertiary' | 'light' | 'dark' | 'text' | 'delete' | 'link'} [props.theme='primary'] - Button theme
 * @param {React.Ref} ref - Forwarded ref
 */
const Button = forwardRef(({ children, as = 'button', size = 'md', theme = 'primary', ...rest }, ref) => {
  const typography = getTypographyClass(size)
  const Component = components[as] || StyledButton

  return (
    <Component ref={ref} className={typography} $size={size} $theme={theme} {...rest}>
      {children}
    </Component>
  )
})

Button.displayName = 'Button'

export default Button
