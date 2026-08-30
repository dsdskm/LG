import React, { useMemo, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { appRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  const processedAppRoutes = useMemo(() => {
    const processRoutes = (routes) => {
      return routes.map((route) => {
        return {
          ...route,
          ...(route.depth && { depth: processRoutes(route.depth) })
        }
      })
    }

    return processRoutes(appRoutes)
  }, [])

  const allRoutes = useMemo(() => flattenRoutes(processedAppRoutes), [processedAppRoutes])
  const headerRoutes = useMemo(() => {
    return processedAppRoutes.map((route) => {
      return {
        name: route.name,
        path: route.path
      }
    })
  }, [processedAppRoutes])

  return (
    <>
      <GlobalStyle />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router
          allRoutes={allRoutes}
          appPrefix={appPrefix}
          processedAppRoutes={processedAppRoutes}
          headerRoutes={headerRoutes}
          appT={appT}
        />
      </Suspense>
    </>
  )
}

export default App
