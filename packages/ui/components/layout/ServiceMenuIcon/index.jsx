import { COMMON_GNB } from '@repo/constants/routes'
import { getAppPrefix } from '@repo/utils'
import { StyledNavButton, HeaderMobileDropdown } from './styles'
import { useResponsiveStore, useSideBarStore } from '@repo/stores'

const ServiceMenuIcon = ({ headerRoutes = COMMON_GNB, t }) => {
  const fullPathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  const currentAppPrefix = getAppPrefix(fullPathname)
  const currentAppName = currentAppPrefix.replace('/', '')
  const { responsiveMode } = useResponsiveStore()
  const { setCompactSideBar } = useSideBarStore()
  const activeRoute =
    headerRoutes.find(
      (item) => item.name === currentAppName || (item.path !== '/' && fullPathname.startsWith(item.path))
    ) || headerRoutes[0]

  const handleMenuClick = (path) => {
    setCompactSideBar(true)
    window.location.href = path
  }

  if (responsiveMode !== 'PC' && responsiveMode !== null) {
    return (
      <HeaderMobileDropdown
        options={headerRoutes.map((item) => ({ name: t(`SideBar.gnb.${item.name}`), value: item.path }))}
        value={activeRoute?.path}
        onChange={handleMenuClick}
        useSelectedIcon={true}
        minWidth="14rem"
        className={responsiveMode}
      />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'nowrap', minWidth: 0 }}>
      {headerRoutes.map((item) => {
        const isActive = item.name === currentAppName || (item.path !== '/' && fullPathname.startsWith(item.path))
        return (
          <StyledNavButton
            key={item.name}
            type="button"
            onClick={() => handleMenuClick(item.path)}
            className="typographyHeading6"
            $isActive={isActive}
          >
            {t(`SideBar.gnb.${item.name}`)}
          </StyledNavButton>
        )
      })}
    </div>
  )
}

export default ServiceMenuIcon
