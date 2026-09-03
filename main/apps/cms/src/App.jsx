import React, { useMemo, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { getAppRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast, GlobalErrorModal } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'
import { useOrganizationStore } from '@repo/stores'
import { languageApis, featureApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')

  const { selectedOrgs, allOrgs } = useOrganizationStore()
  const [enabledFeatures, setEnabledFeatures] = useState(() => new Set())

  useEffect(() => {
    let active = true
    const fetchEnabled = async () => {
      const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
      try {
        const params = {}
        if (groupId != null) params.groupId = groupId
        if (siteId != null) params.siteId = siteId
        const res = await featureApis.getEnabled(params)
        if (active) setEnabledFeatures(new Set(res?.results || []))
      } catch {
        if (active) setEnabledFeatures(new Set())
      }
    }
    fetchEnabled()
    return () => {
      active = false
    }
  }, [selectedOrgs, allOrgs])

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

    return processRoutes(getAppRoutes(enabledFeatures))
  }, [enabledFeatures])

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
