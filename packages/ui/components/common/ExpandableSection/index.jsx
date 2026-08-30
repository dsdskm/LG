import { useState } from 'react'
import { StyledSelectButton, StyledDiv } from './styles'
import Icon from '../Icon'

const ExpandableSection = ({ header, expandedHeader, children, iconPosition = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const icon = <Icon name={isOpen ? 'arrow_up' : 'arrow_down'} size={16} />

  return (
    <div>
      <StyledSelectButton
        type="button"
        className="typographyBody5 selectButton"
        onClick={handleToggle}
        $iconPosition={iconPosition}
      >
        {iconPosition === 'left' && icon}
        {isOpen ? expandedHeader || header : header}
        {iconPosition === 'right' && icon}
      </StyledSelectButton>

      {isOpen && <StyledDiv>{children}</StyledDiv>}
    </div>
  )
}

export default ExpandableSection
;``
