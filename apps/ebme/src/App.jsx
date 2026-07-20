import { GlobalStyle } from '@repo/ui/styles'
import Robot from './pages/Robot'
import Logplay from './pages/Logplay'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'
import { Navigate } from 'react-router-dom'

const sidebarRoutes = {
  gnb: [
    {
      name: 'robot',
      path: '/ebme/robot',
      prefix: 'ebme',
      icon: 'robot',
      element: <Robot />
    }
  ]
}

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
    path: '/ebme/',
    prefix: 'ebme',
    element: <Navigate to="/ebme/robot" replace />
  })
  return result
}

function App() {
  useWindowDimensions()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')
  const allRoutes = flattenRoutes(sidebarRoutes.gnb)
  return (
    <>
      <GlobalStyle />
      <Toast />
      <React.Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Routes>
          {allRoutes.map((item) => (
            <Route
              key={item.name}
              path={item.path}
              element={
                <MainLayout appRoutes={sidebarRoutes.gnb} t={appT}>
                  {item.element}
                </MainLayout>
              }
            />
          ))}
          <Route path="/ebme/logplay" element={<Logplay />} />
        </Routes>
      </React.Suspense>
    </>
  )
}

export default App

