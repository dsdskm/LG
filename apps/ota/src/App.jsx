import React, { useMemo, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { getAppRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { GlobalStyle } from '@repo/ui/styles'
import { GlobalErrorModal, Toast } from '@repo/ui'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import 'react-toastify/dist/ReactToastify.css'
import { useUserStore } from '@repo/stores'
import { useOrganizationStore } from '@repo/stores'

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')
  const { session } = useUserStore()
  const { company } = useOrganizationStore()

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  const processedAppRoutes = useMemo(() => {
    const processRoutes = (routes) => {
      return routes.map((route) => {
        let hide = route.hide
        if (!hide && session?.userRole === 'SYSTEM_ADMIN') {
          hide = false
        } else if (session?.userRole === 'GROUP_MANAGER') {
          if (!hide && route.showForGroupManager) {
            hide = false
          }
        }
        return {
          ...route,
          hide,
          ...(route.depth && { depth: processRoutes(route.depth) })
        }
      })
    }

    return processRoutes(getAppRoutes(company))
  }, [session?.userRole, company])

  const allRoutes = useMemo(() => flattenRoutes(processedAppRoutes), [processedAppRoutes])

  return (
    <>
      <GlobalStyle />
      <GlobalErrorModal />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router allRoutes={allRoutes} appPrefix={appPrefix} processedAppRoutes={processedAppRoutes} appT={appT} />
      </Suspense>
    </>
  )
}

export default App
