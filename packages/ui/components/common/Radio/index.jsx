import { forwardRef } from 'react'
import { StyledRadio } from './styles'

const Radio = forwardRef(({ label, disabled, ...rest }, ref) => {
  return (
    <StyledRadio className={disabled ? 'disabled' : ''}>
      <input type="radio" ref={ref} disabled={disabled} {...rest} />
      <span className="radio-mark"></span>
      {label && <span className="typographyBody5">{label}</span>}
    </StyledRadio>
  )
})

Radio.displayName = 'Radio'

export default Radio
