import SideBar from '../SideBar'
import Header from '../Header'
import Footer from '../Footer'
import ScrollArea from '../ScrollArea'
import AiAssistantPanel from '../AiAssistantPanel'
import { StyledLayout, MainContent } from './styles'
import { useLocation } from 'react-router-dom'
import { useRouteStore, useSideBarStore, useResponsiveStore, useAiAssistantStore } from '@repo/stores'
import { useEffect, useMemo, useRef, useCallback } from 'react'

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
  const { responsiveMode } = useResponsiveStore()
  const prevResponsiveModeRef = useRef(responsiveMode)
  const scrollAreaRef = useRef(null)

  const handleContentClick = useCallback(() => {
    if (responsiveMode !== 'PC' && !compactSideBar) {
      useSideBarStore.getState().setCompactSideBar(true)
    }
  }, [responsiveMode, compactSideBar])

  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    scrollArea.addEventListener('click', handleContentClick, true)
    return () => {
      scrollArea.removeEventListener('click', handleContentClick, true)
    }
  }, [handleContentClick])

  useEffect(() => {
    setRoute(gnb, pathname)
  }, [gnb, pathname, setRoute])

  useEffect(() => {
    if (prevResponsiveModeRef.current === 'PC' && responsiveMode !== 'PC') {
      useSideBarStore.getState().setCompactSideBar(true)
      useAiAssistantStore.getState().closePanel()
    }
    prevResponsiveModeRef.current = responsiveMode
  }, [responsiveMode])

  return (
    <StyledLayout $compact={compactSideBar} $sideBarOpen={!compactSideBar && responsiveMode !== 'PC'}>
      {HeaderComponent ? (
        <HeaderComponent headerRoutes={headerRoutes || appRoutes} t={t} LogoComponent={LogoComponent} />
      ) : (
        <Header headerRoutes={headerRoutes || appRoutes} t={t} LogoComponent={LogoComponent} />
      )}

      <SideBar routes={finalSideBarRoutes} t={t} />

      <ScrollArea ref={scrollAreaRef} onClick={handleContentClick}>
        <MainContent>{children}</MainContent>
        <Footer routes={footerRoutes} />
      </ScrollArea>

      <AiAssistantPanel className="aiAssistantPanel" greetingExtra={aiGreetingExtra} />
    </StyledLayout>
  )
}

export default MainLayout
