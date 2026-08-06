import React, { useMemo, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { appRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { createGlobalStyle } from 'styled-components'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'

// 공용 MainLayout(@repo/ui) 의 MainContent 는 padding: 20px 을 갖는다.
// init-setup 은 화면 가장자리까지 꽉 채워 쓰므로 이 앱에서만 여백을 제거한다.
// (공용 패키지는 다른 앱들도 함께 쓰기 때문에 수정하지 않는다)
const AppGlobalStyle = createGlobalStyle`
  #mainContent {
    padding: 0;
  }
`

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

  return (
    <>
      <GlobalStyle />
      <AppGlobalStyle />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router allRoutes={allRoutes} appPrefix={appPrefix} processedAppRoutes={processedAppRoutes} appT={appT} />
      </Suspense>
    </>
  )
}

export default App
