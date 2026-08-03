import React, { useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import Home from './pages/Home'
import { Toast } from '@repo/ui'
import { useUserStore } from '@repo/stores'
import 'react-toastify/dist/ReactToastify.css'

import { COMMON_GNB } from '@repo/constants'
import { useTranslation } from 'react-i18next'
import Dashboard from './pages/Dashboard'
import Management from './pages/Management'
import Logreplay from './pages/Logreplay'
import Apitest from './pages/Apitest'
import Detail from './pages/Detail'
import ReplayControls from './pages/ReplayControls'
import UserManagement from './pages/UserManagement'
import GroupManagement from './pages/GroupManagement'
import SiteDetail from './pages/SiteDetail'
import { AppProvider } from './common/AppContext'
import MapManagement from './pages/MapManagement'
import MapDetail from './pages/MapManagement/MapDetail'
import MapHistory from './pages/MapManagement/MapHistory'
import AiLogManagement from './pages/AiLogManagement'
import AiEventSummaryPanel from './pages/Dashboard/components/AiEventSummaryPanel'
import TVDashboard from './pages/TVDashboard'
import TermManagement from './pages/TermManagement'

const appRoutes = [
  {
    name: 'dashboard',
    path: '/robot/dashboard',
    prefix: 'robot',
    icon: 'dashboard',
    element: <Dashboard />,
    accessLevel: [0, 1, 2, 3]
  },
  {
    name: 'robotList',
    path: '/robot/management',
    prefix: 'robot',
    icon: 'category',
    element: <Management />,
    accessLevel: [0, 1, 2, 3],
    depth: [
      {
        name: 'robotDetail',
        hide: true,
        hasBack: true,
        path: '/robot/management/detail',
        prefix: 'robot',
        element: <Detail />
      }
    ]
  },
  {
    name: 'mapManagement',
    path: '/robot/maps',
    prefix: 'robot',
    icon: 'map',
    element: <MapManagement />,
    accessLevel: [0, 1, 2, 3],
    depth: [
      {
        name: 'mapDetail',
        hide: true,
        hasBack: true,
        path: '/robot/maps/detail',
        prefix: 'robot',
        element: <MapDetail />
      },
      {
        name: 'mapHistory',
        hide: true,
        hasBack: true,
        path: '/robot/maps/history',
        prefix: 'robot',
        element: <MapHistory />
      }
    ]
  },

  {
    name: 'aiLogManagement',
    path: '/robot/ailog',
    prefix: 'robot',
    icon: 'support',
    element: <AiLogManagement />,
    accessLevel: [1, 2, 3],
    depth: [
      {
        name: 'aiLogManagementTab',
        hide: true,
        path: '/robot/ailog/:tab',
        prefix: 'robot',
        element: <AiLogManagement />
      }
    ]
  },
  {
    name: 'groupManagement',
    path: '/robot/groups',
    prefix: 'robot',
    icon: 'group',
    element: <GroupManagement />,
    accessLevel: [1, 2, 3],
    depth: [
      {
        name: 'siteDetail',
        hide: true,
        hasBack: true,
        path: '/robot/groups/sitedetail',
        prefix: 'robot',
        element: <SiteDetail />
      }
    ]
  },
  {
    name: 'userManagement',
    path: '/robot/users',
    prefix: 'robot',
    icon: 'user',
    element: <UserManagement />,
    accessLevel: [2, 3]
  },
  {
    name: 'settings',
    prefix: 'settings',
    icon: 'settings',
    accessLevel: [3],
    depth: [
      {
        name: 'termManagement',
        path: '/robot/terms',
        prefix: 'settings',
        icon: 'terms',
        element: <TermManagement />
      }
    ]
  }
]

const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || 'robot'
}

const session = useUserStore.getState().session

const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  result.push({
    name: '',
    path: '/robot/',
    prefix: 'robot',
    element: <Navigate to="/robot/dashboard" replace />
  })
  return result
}

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')
  const { isLoggedIn, session } = useUserStore.getState()

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  //console.log('isLoggedIn=' + isLoggedIn)

  if (!isLoggedIn) {
    window.location.href = '/login'
    return
  }

  const allRoutes = useMemo(() => flattenRoutes(appRoutes), [])
  return (
    <>
      <GlobalStyle />
      <Toast />
      <React.Suspense fallback={<div>{layoutT('loading')}</div>}>
        <AppProvider>
          <Routes>
            {allRoutes.map((item) => (
              <Route
                key={item.name}
                path={item.path}
                element={
                  <MainLayout
                    currentApp={appPrefix}
                    appRoutes={appRoutes}
                    t={appT}
                    aiGreetingExtra={<AiEventSummaryPanel />}
                  >
                    {item.element}
                  </MainLayout>
                }
              />
            ))}
            <Route path="/robot/logreplay" element={<Logreplay />} />
            <Route path="/robot/tv" element={<TVDashboard />} />
            <Route path="/robot/apitest" element={<Apitest />} />
            <Route path="/robot/replaycontrols" element={<ReplayControls />} />
            <Route path="/robot/sitedetail" element={<SiteDetail />} />
            {/* <Route path="*" element={<Navigate to="/error" />} /> */}
          </Routes>
        </AppProvider>
      </React.Suspense>
    </>
  )
}

export default App
