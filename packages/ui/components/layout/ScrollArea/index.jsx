import { StyledScrollArea } from './styles'

const ScrollArea = ({ children }) => {
  return (
    <StyledScrollArea id="contents" className="scrollArea">
      {children}
    </StyledScrollArea>
  )
}

export default ScrollArea
