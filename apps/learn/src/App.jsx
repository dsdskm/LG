import React, { useMemo, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MainLayout, Toast } from '@repo/ui'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useUserStore } from '@repo/stores'
import { useTranslation } from 'react-i18next'
import 'react-toastify/dist/ReactToastify.css'
import './i18n'
import { LearningProvider } from './context/LearningContext'

// ── lazy imports ──
const LearningOverviewPage = lazy(() => import('./pages/LearningOverviewPage'))
const LauncherPage = lazy(() => import('./pages/LauncherPage'))
const TmsLearningPage = lazy(() => import('./pages/TmsLearningPage'))
const TmsEpisodeCandidatePage = lazy(() => import('./pages/TmsEpisodeCandidatePage'))
const TeleopPage = lazy(() => import('./pages/TeleopPage'))
const LearnByWatchingPage = lazy(() => import('./pages/LearnByWatchingPage'))
const SimAugPage = lazy(() => import('./pages/SimAugPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const DataReadinessPage = lazy(() => import('./pages/DataReadinessPage'))
const TrainingStatusPage = lazy(() => import('./pages/TrainingStatusPage'))
const ReviewApprovalPage = lazy(() => import('./pages/ReviewApprovalPage'))

const appRoutes = [
  {
    name: 'overview',
    path: '/learning/overview',
    prefix: 'learning',
    icon: 'home',
    element: <LearningOverviewPage />,
    accessLevel: [0, 1, 2, 3]
  },
  {
    name: 'launcher',
    path: '/learning/home',
    prefix: 'learning',
    icon: 'apps',
    element: <LauncherPage />,
    accessLevel: [0, 1, 2, 3],
    depth: [
      {
        name: 'tms',
        path: '/learning/tms',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <TmsLearningPage />
      },
      {
        name: 'tmsEpisodes',
        path: '/learning/tms/episodes/:executionId',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <TmsEpisodeCandidatePage />
      },
      {
        name: 'teleop',
        path: '/learning/teleop',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <TeleopPage />
      },
      {
        name: 'watch',
        path: '/learning/watch',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <LearnByWatchingPage />
      },
      {
        name: 'simulation',
        path: '/learning/simulation',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <SimAugPage />
      },
      {
        name: 'upload',
        path: '/learning/upload',
        hide: true,
        hasBack: true,
        prefix: 'learning',
        element: <UploadPage />
      }
    ]
  },
  {
    name: 'data',
    path: '/learning/data',
    prefix: 'learning',
    icon: 'statistics',
    element: <DataReadinessPage />,
    accessLevel: [0, 1, 2, 3]
  },
  {
    name: 'training',
    path: '/learning/training',
    prefix: 'learning',
    icon: 'robot',
    element: <TrainingStatusPage />,
    accessLevel: [0, 1, 2, 3]
  },
  {
    name: 'review',
    path: '/learning/review',
    prefix: 'learning',
    icon: 'check',
    element: <ReviewApprovalPage />,
    accessLevel: [0, 1, 2, 3]
  }
]

const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  return result
}

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')
  const { isLoggedIn } = useUserStore.getState()

  if (!isLoggedIn) {
    if (!import.meta.env.VITE_SKIP_LOGIN || import.meta.env.VITE_SKIP_LOGIN !== 'Y') {
      window.location.href = '/login'
      return null
    }
  }

  const appPrefix = useMemo(() => pathname.split('/').filter(Boolean)[0] || 'learning', [pathname])
  const allRoutes = useMemo(() => flattenRoutes(appRoutes), [])

  return (
    <>
      <GlobalStyle />
      <Toast />
      <React.Suspense fallback={<div>{layoutT('loading')}</div>}>
        <LearningProvider>
          <Routes>
            {allRoutes.map((item) => (
              <Route
                key={item.name}
                path={item.path}
                element={
                  <MainLayout currentApp={appPrefix} appRoutes={appRoutes} t={appT}>
                    {item.element}
                  </MainLayout>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/learning/overview" replace />} />
          </Routes>
        </LearningProvider>
      </React.Suspense>
    </>
  )
}

export default App
