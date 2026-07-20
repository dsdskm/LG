import { useState } from 'react'
import { StyledSelectButton, StyledDiv } from './styles'
import Icon from '../Icon'

const ExpandableSection = ({ header, expandedHeader, children }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <div>
      <StyledSelectButton type="button" className="typographyBody5 selectButton" onClick={handleToggle}>
        {isOpen ? expandedHeader || header : header}
        <Icon name={isOpen ? 'arrow_up' : 'arrow_down'} size={16} />
      </StyledSelectButton>

      {isOpen && <StyledDiv>{children}</StyledDiv>}
    </div>
  )
}

export default ExpandableSection
;``
