import { StyledTitle } from './styles'
import { useRouteStore } from '@repo/stores'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@repo/ui'
import { Icon } from '@repo/ui'
import { useNavigate } from 'react-router-dom'
function Title({ children, onBack }) {
  const navigate = useNavigate()
  const { t } = useTranslation(['layout', 'route'])
  const { currentRoute } = useRouteStore()
  const hasBack = currentRoute?.hasBack || false
  const route = useMemo(
    () => ({
      name: currentRoute?.name || '',
      info: currentRoute?.info || ''
    }),
    [currentRoute]
  )

  return (
    <StyledTitle>
      <h2 className="title typographyHeading3">
        {hasBack && (
          <IconButton size="sm" onClick={() => (onBack ? onBack() : navigate(-1))}>
            <Icon name="page_back" color="var(--color-neutral-80)" size={18} />
          </IconButton>
        )}
        {children || t(`Depth.${route.name}.name`, t(`SideBar.gnb.${route.name}`, route.name))}
      </h2>
      {route.info && <p className="info typographyBody3 medium">{t(`Depth.${route.name}.info`)}</p>}
    </StyledTitle>
  )
}

export default Title
