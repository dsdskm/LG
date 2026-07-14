import { StyledModalButton } from './styles'

const ModalButton = ({ children, size = 'lg', theme = 'tertiary', ...rest }) => {
  return (
    <StyledModalButton type="button" $size={size} $theme={theme} {...rest}>
      {children}
    </StyledModalButton>
  )
}

export default ModalButton
