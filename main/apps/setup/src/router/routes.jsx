import { Navigate } from 'react-router-dom'
import DefaultSetup from '../pages/DefaultSetup'
import DrivingSetup from '../pages/DefaultSetup/DrivingSetup'
import RAAT from '../pages/HwTest/RAAT'
import Ros2Status from '../pages/HwTest/Ros2Status'
import Diagnostics from '../pages/HwTest/Diagnostics'

export const SETUP_HEADER_GNB = [
  { name: 'default', path: '/default/', prefix: 'default', icon: 'default' },
  { name: 'hwTest', path: '/hwTest/', prefix: 'hwTest', icon: 'hwTest' }
]

export const appRoutes = [
  {
    name: 'default',
    path: '/default',
    prefix: '/default',
    icon: 'campaign',
    element: <Navigate to="/default/device" replace />,
    depth: [
      {
        name: 'device',
        path: '/default/device',
        icon: 'edit',
        element: <DefaultSetup />
      },
      {
        name: 'driving',
        path: '/default/driving',
        icon: 'settings',
        element: <DrivingSetup />
      }
    ]
  },
  {
    name: 'hwTest',
    path: '/hwTest',
    prefix: '/hwTest',
    icon: 'group',
    element: <Navigate to="/hwTest/raat" replace />,
    depth: [
      {
        name: 'raat',
        path: '/hwTest/raat',
        icon: 'list',
        element: <RAAT />
      },
      {
        name: 'ros2Status',
        path: '/hwTest/ros2-status',
        icon: 'list',
        element: <Ros2Status />
      },
      {
        name: 'diagnostics',
        path: '/hwTest/diagnostics',
        icon: 'list',
        element: <Diagnostics />
      }
    ]
  }
]

export const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || 'setup'
}

export const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  // Root redirect
  if (!result.find((r) => r.path === '/')) {
    result.push({
      name: '',
      path: '/',
      prefix: '',
      element: <Navigate to="/default/device" replace />
    })
  }
  return result
}
