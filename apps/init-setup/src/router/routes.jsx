import { Navigate } from 'react-router-dom'
import Map from '@/pages/Map'
import Poi from '@/pages/Map/Poi'
import Zone from '@/pages/Map/Zone'
import Language from '@/pages/Default/Language'
import Network from '@/pages/Default/Network'
import SiteCode from '@/pages/Default/SiteCode'
import RobotInfo from '@/pages/Default/RobotInfo'
import Location from '@/pages/Default/Location'
import Terms from '@/pages/Default/Terms'
import Upload from '@/pages/Upload'
import Login from '@/pages/Login'
import RootGuard from '@/components/RootGuard'

export const HEADER_GNB = [
  // { name: 'default', path: '/default', prefix: '', icon: '' },
  // { name: 'map', path: '/map', prefix: 'map', icon: 'map' }
]

export const appRoutes = [
  {
    name: 'language',
    path: '/language',
    prefix: '',
    icon: 'language',
    element: <Language />
  },
  {
    name: 'network',
    path: '/network',
    prefix: '',
    icon: 'link',
    element: <Network />
  },
  {
    name: 'siteCode',
    path: '/site-code',
    prefix: '',
    icon: 'site_management',
    element: <SiteCode />
  },
  {
    name: 'robotInfo',
    path: '/robot-info',
    prefix: '',
    icon: 'robot',
    element: <RobotInfo />
  },
  {
    name: 'location',
    path: '/location',
    prefix: '',
    icon: 'location',
    element: <Location />
  },
  {
    name: 'terms',
    path: '/terms',
    prefix: '',
    icon: 'policy',
    element: <Terms />
  },
  {
    name: 'map',
    prefix: '',
    icon: 'map',
    depth: [
      {
        name: 'scan',
        path: '/map/scan',
        prefix: '',
        element: <Map />
      },
      {
        name: 'zone',
        path: '/map/zone',
        prefix: '',
        element: <Zone />
      },
      {
        name: 'poi',
        path: '/map/poi',
        prefix: '',
        element: <Poi />
      }
    ]
  },
  {
    name: 'login',
    path: '/login',
    prefix: '',
    icon: 'publish',
    hide: true,
    hideLayout: true,
    element: <Login />
  },
  {
    name: 'upload',
    path: '/upload',
    prefix: '',
    icon: 'publish',
    element: <Upload />
  }
]
export const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || ''
}

export const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    const { depth, ...rest } = route
    result.push(rest)
    if (depth) {
      result = [...result, ...flattenRoutes(depth)]
    }
  })
  result.push({ name: '', path: '/', prefix: '', hideLayout: true, element: <RootGuard /> })
  return result
}
