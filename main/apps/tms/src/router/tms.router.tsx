import type { ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AiAssistantPanel, MainLayout } from '@repo/ui'
import RouteSync from './tms.routeSync'

type RouteItem = {
  name?: string
  path?: string
  element?: ReactNode
  depth?: RouteItem[]
  [key: string]: any
}

interface RouterProps {
  allRoutes: RouteItem[]
  appPrefix: string
  processedAppRoutes: RouteItem[]
  headerRoutes: { name?: string; path?: string }[]
  appT: any
}

const Router = ({ allRoutes, appPrefix, processedAppRoutes, headerRoutes, appT }: RouterProps) => {
  const FULLSCREEN_PATHS = new Set<string>(['/tms/taskflows/:taskFlowId/canvas'])

  const safeAllRoutes = Array.isArray(allRoutes)
    ? allRoutes.filter((item): item is RouteItem => Boolean(item && typeof item === 'object' && item.path))
    : []

  return (
    <>
      <RouteSync appRoutes={processedAppRoutes} />

      <Routes>
        {safeAllRoutes.map((item) => {
          const isFullscreen = FULLSCREEN_PATHS.has(item.path as string)

          return (
            <Route
              key={item.name || item.path}
              path={item.path}
              element={
                isFullscreen ? (
                  <>
                    {item.element}
                    <div
                      style={{
                        position: 'fixed',
                        right: 0,
                        top: 0,
                        height: '100vh',
                        display: 'flex',
                        zIndex: 850,
                      }}
                    >
                      <AiAssistantPanel />
                    </div>
                  </>
                ) : (
                  <MainLayout
                    currentApp={appPrefix}
                    appRoutes={processedAppRoutes}
                    headerRoutes={headerRoutes}
                    t={appT}
                  >
                    {item.element}
                  </MainLayout>
                )
              }
            />
          )
        })}
      </Routes>
    </>
  )
}

export default Router
