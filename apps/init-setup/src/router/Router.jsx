import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import CustomHeader from '@/components/CustomHeader'

const Router = ({ allRoutes, appPrefix, processedAppRoutes, headerRoutes, appT }) => {
  return (
    <Routes>
      {allRoutes.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={
            item.hideLayout ? (
              item.element
            ) : (
              <MainLayout
                currentApp={appPrefix}
                appRoutes={
                  item.prefix
                    ? processedAppRoutes.filter((route) => route.prefix === item.prefix)
                    : processedAppRoutes
                }
                headerRoutes={headerRoutes}
                t={appT}
                useSubRoutes={false}
                HeaderComponent={CustomHeader}
              >
                {item.element}
              </MainLayout>
            )
          }
        />
      ))}
    </Routes>
  )
}

export default Router
