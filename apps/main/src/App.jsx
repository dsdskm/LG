import React, { useMemo, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import Login from './pages/auth/Login'
import ErrorPage from './pages/Error'
import SetPassword from './pages/auth/SetPassword'
import ResetPassword from './pages/auth/ResetPassword'
import CustomerInquiry from './pages/CustomerInquiry'
import Invitations from './pages/auth/Invitations'

const OTA = React.lazy(() => import('ota/App'))
const Robot = React.lazy(() => import('robot/App'))
const CMS = React.lazy(() => import('cms/App'))
const TMS = React.lazy(() => import('tms/App'))
const Learning = React.lazy(() => import('learn/App'))

const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || ''
}

import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'

const RootRedirect = () => {
  React.useEffect(() => {
    window.location.replace('/robot/dashboard')
  }, [])
  return null
}

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  return (
    <I18nextProvider i18n={i18n}>
      <GlobalStyle />
      <Toast />
      <React.Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/customer-inquiry" element={<CustomerInquiry />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/ota/*"
            element={
              <MainLayout currentApp={appPrefix}>
                <OTA />
              </MainLayout>
            }
          />
          <Route
            path="/robot/*"
            element={
              <MainLayout currentApp={appPrefix}>
                <Robot />
              </MainLayout>
            }
          />
          <Route
            path="/cms/*"
            element={
              <MainLayout currentApp={appPrefix}>
                <CMS />
              </MainLayout>
            }
          />{' '}
          <Route
            path="/tms/*"
            element={
              <MainLayout currentApp={appPrefix}>
                <TMS />
              </MainLayout>
            }
          />
          <Route
            path="/learn/*"
            element={
              <MainLayout currentApp={appPrefix}>
                <Learning />
              </MainLayout>
            }
          />
        </Routes>
      </React.Suspense>
    </I18nextProvider>
  )
}

export default App
