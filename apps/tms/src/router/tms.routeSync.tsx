import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useRouteStore } from '@repo/stores'

type RouteItem = {
  name?: string
  path?: string
  hasBack?: boolean
  info?: string
  depth?: RouteItem[]
  [key: string]: any
}

interface RouteSyncProps {
  appRoutes?: RouteItem[]
}

function sanitizeRoutes(routes?: RouteItem[]): RouteItem[] {
  if (!Array.isArray(routes)) return []

  return routes
    .filter((route): route is RouteItem => Boolean(route && typeof route === 'object'))
    .map((route) => ({
      ...route,
      depth: sanitizeRoutes(route.depth)
    }))
}

function RouteSync({ appRoutes = [] }: RouteSyncProps) {
  const location = useLocation()
  const setRoute = useRouteStore((state: any) => state.setRoute)

  const safeAppRoutes = useMemo(() => sanitizeRoutes(appRoutes), [appRoutes])

  useEffect(() => {
    if (!safeAppRoutes.length) return
    setRoute(safeAppRoutes, location.pathname)
  }, [safeAppRoutes, location.pathname, setRoute])

  return null
}

export default RouteSync
