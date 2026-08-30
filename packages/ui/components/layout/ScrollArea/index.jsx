import { forwardRef } from 'react'
import { StyledScrollArea } from './styles'

const ScrollArea = forwardRef(({ children, ...props }, ref) => {
  return (
    <StyledScrollArea ref={ref} id="contents" className="scrollArea" {...props}>
      {children}
    </StyledScrollArea>
  )
})

ScrollArea.displayName = 'ScrollArea'

export default ScrollArea
