import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import SetupHeader from '../components/SetupHeader'

const Router = ({ allRoutes, appPrefix, processedAppRoutes, headerRoutes, appT }) => {
  return (
    <Routes>
      {allRoutes.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={
            <MainLayout
              currentApp={appPrefix}
              appRoutes={processedAppRoutes}
              headerRoutes={headerRoutes}
              t={appT}
              useSubRoutes={true}
              HeaderComponent={SetupHeader}
            >
              {item.element}
            </MainLayout>
          }
        />
      ))}
    </Routes>
  )
}

export default Router
