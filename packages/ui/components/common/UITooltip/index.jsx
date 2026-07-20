import { Tooltip } from 'react-tooltip'
import { StyledToolTipContainer } from './styles'

const UITooltip = ({ id, size = 'lg', children }) => {
  return (
    <StyledToolTipContainer $size={size}>
      <Tooltip
        id={id}
        className="tooltip"
        offset={8}
        opacity={1}
        positionStrategy="fixed"
        render={({ activeAnchor }) => (
          <>
            {activeAnchor?.getAttribute('data-tooltip-title') && (
              <b className="tooltipTitle typographyHeading6">{activeAnchor?.getAttribute('data-tooltip-title')}</b>
            )}

            <p className="tooltipDesc typographyBody6">{activeAnchor?.getAttribute('data-tooltip-desc')}</p>
            {children}
          </>
        )}
      />
    </StyledToolTipContainer>
  )
}

export default UITooltip
