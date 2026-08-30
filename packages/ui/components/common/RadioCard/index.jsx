import { forwardRef } from 'react'
import { StyledRadioCard } from './styles'

const RadioCard = forwardRef(({ title, subtitle, description, disabled, ...rest }, ref) => {
  return (
    <StyledRadioCard className={disabled ? 'disabled' : ''}>
      <input type="radio" ref={ref} disabled={disabled} {...rest} />
      <span className="radio-mark"></span>
      <span className="content">
        <span className="heading">
          {title && <span className="title typographyBody4">{title}</span>}
          {subtitle && <span className="subtitle typographyBody6">{subtitle}</span>}
        </span>
        {description && <span className="description typographyBody6">{description}</span>}
      </span>
    </StyledRadioCard>
  )
})

RadioCard.displayName = 'RadioCard'

export default RadioCard
