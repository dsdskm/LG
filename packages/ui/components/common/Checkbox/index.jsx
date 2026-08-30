import { forwardRef } from 'react'
import { StyledCheckbox } from './styles'
import SvgDefault from '../../../assets/svgs/checkbox_default.svg'
import SvgChecked from '../../../assets/svgs/checkbox_checked.svg'

const Checkbox = forwardRef(({ type = 'checkbox', label, disabled, ...rest }, ref) => {
  return (
    <StyledCheckbox className={disabled ? 'disabled' : ''}>
      <input type={type} ref={ref} disabled={disabled} {...rest} />
      <span className="checkbox">
        <SvgDefault className="default" />
        <SvgChecked className="checked" />
      </span>
      {label && <span className="typographyBody5">{label}</span>}
    </StyledCheckbox>
  )
})

Checkbox.displayName = 'Checkbox'

export default Checkbox
