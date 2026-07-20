import React, { useMemo, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { appRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'
import { languageApis } from '@/apis'

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await languageApis.getLanguages()
        if (response && response.results) {
          sessionStorage.setItem('CMS_LANG', JSON.stringify(response.results))
          window.dispatchEvent(new Event('cmsLanguagesLoaded'))
        }
      } catch (error) {
        console.error('Failed to fetch and store languages:', error)
      }
    }
    fetchLanguages()
  }, [])

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  const processedAppRoutes = useMemo(() => {
    const processRoutes = (routes) => {
      return routes.map((route) => {
        let hide = route.hide

        return {
          ...route,
          hide,
          ...(route.depth && { depth: processRoutes(route.depth) })
        }
      })
    }

    return processRoutes(appRoutes)
  }, [])

  const allRoutes = useMemo(() => flattenRoutes(processedAppRoutes), [processedAppRoutes])

  return (
    <>
      <GlobalStyle />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router allRoutes={allRoutes} appPrefix={appPrefix} processedAppRoutes={processedAppRoutes} appT={appT} />
      </Suspense>
    </>
  )
}

export default App
