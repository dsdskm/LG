import { StyledTag } from './styles'

const Tag = ({ children, name, theme = 'light' }) => {
  return <StyledTag $theme={theme}>{children || name}</StyledTag>
}

export default Tag
