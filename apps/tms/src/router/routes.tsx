import DeployPage from '@/pages/DeployPage'
import RobotDetailPage from '@/pages/RobotDetailPage'
import RobotsPage from '@/pages/RobotsPage'
import TaskFlowCanvasPage from '@/pages/TaskFlowCanvasPage'
import TaskFlowListDetailPage from '@/pages/TaskFlowListDetailPage'
import TaskFlowListPage from '@/pages/TaskFlowListPage'
import { Navigate } from 'react-router-dom'

export const appRoutes = [
  {
    name: 'taskflows',
    path: '/tms',
    prefix: 'tms',
    icon: 'dashboard',
    element: <TaskFlowListPage />,
    depth: [
      {
        name: 'taskflowDetail',
        hide: true,
        hasBack: true,
        path: '/tms/taskflows/:taskFlowId/detail',
        prefix: 'tms',
        element: <TaskFlowListDetailPage />,
        depth: [
          {
            name: 'deploy',
            hide: true,
            hasBack: true,
            path: '/tms/taskflows/:taskFlowId/detail/deploy',
            prefix: 'tms',
            element: <DeployPage />
          }
        ]
      },
      {
        name: 'taskflowCanvas',
        hide: true,
        hasBack: true,
        path: '/tms/taskflows/:taskFlowId/canvas',
        prefix: 'tms',
        element: <TaskFlowCanvasPage />
      }
    ],
    accessLevel: [0, 1, 2, 3]
  },

  {
    name: 'robots',
    path: '/tms/robots',
    prefix: 'tms',
    icon: 'robot',
    element: <RobotsPage />,
    depth: [
      {
        name: 'robotDetail',
        hide: true,
        hasBack: true,
        path: '/tms/robots/:robotId/detail',
        prefix: 'tms',
        element: <RobotDetailPage />
      }
    ],
    accessLevel: [0, 1, 2, 3]
  }
]

export const getAppPrefix = (pathname: string) => {
  return pathname.split('/').filter(Boolean)[0] || 'setup'
}

export const flattenRoutes = (routes: any) => {
  let result: any = []
  routes.forEach((route: any) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  // Root redirect
  if (!result.find((r: any) => r.path === '/')) {
    result.push({
      name: '',
      path: '/',
      prefix: '',
      element: <Navigate to="/" replace />
    })
  }
  return result
}
