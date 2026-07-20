import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@repo/ui'

const Router = ({ allRoutes, appPrefix, processedAppRoutes, appT }) => {
  return (
    <Routes>
      {allRoutes.map((item) => (
        <Route
          key={item.name}
          path={item.path}
          element={
            <MainLayout currentApp={appPrefix} appRoutes={processedAppRoutes} t={appT}>
              {item.element}
            </MainLayout>
          }
        />
      ))}
      {/* <Route path="*" element={<Navigate to="/error" />} /> */}
    </Routes>
  )
}

export default Router
