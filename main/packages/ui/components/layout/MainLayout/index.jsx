import SideBar from '../SideBar'
import Header from '../Header'
import Footer from '../Footer'
import ScrollArea from '../ScrollArea'
import AiAssistantPanel from '../AiAssistantPanel'
import { StyledLayout, MainContent } from './styles'
import { useLocation } from 'react-router-dom'
import { useRouteStore, useSideBarStore } from '@repo/stores'
import { useEffect, useMemo } from 'react'

const MainLayout = ({
  children,
  footerRoutes,
  appRoutes = [],
  headerRoutes,
  t,
  useSubRoutes = false,
  LogoComponent,
  HeaderComponent,
  aiGreetingExtra
}) => {
  const location = useLocation()
  const { pathname } = location

  const activeTopLevelRoute = useMemo(() => {
    return appRoutes.find((route) => pathname.startsWith(route.path))
  }, [appRoutes, pathname])

  const finalSideBarRoutes = useMemo(() => {
    if (useSubRoutes && activeTopLevelRoute?.depth) {
      return { gnb: activeTopLevelRoute.depth }
    }
    return { gnb: appRoutes }
  }, [appRoutes, activeTopLevelRoute, useSubRoutes])

  const { gnb } = finalSideBarRoutes
  const setRoute = useRouteStore((state) => state.setRoute)
  const compactSideBar = useSideBarStore((state) => state.compactSideBar)

  useEffect(() => {
    setRoute(gnb, pathname)
  }, [gnb, pathname, setRoute])

  return (
    <StyledLayout $compact={compactSideBar}>
      {HeaderComponent ? (
        <HeaderComponent headerRoutes={headerRoutes || appRoutes} t={t} LogoComponent={LogoComponent} />
      ) : (
        <Header headerRoutes={headerRoutes || appRoutes} t={t} LogoComponent={LogoComponent} />
      )}

      <SideBar routes={finalSideBarRoutes} t={t} />

      <ScrollArea>
        <MainContent>{children}</MainContent>
        <Footer routes={footerRoutes} />
      </ScrollArea>

      <AiAssistantPanel className="aiAssistantPanel" greetingExtra={aiGreetingExtra} />
    </StyledLayout>
  )
}

export default MainLayout
