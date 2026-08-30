import { lazy, Suspense } from 'react'
import { Loading } from '@repo/ui'
import Home from '../pages/Home'

const routes = [
  {
    name: 'Page2',
    path: '',
    element: (
      <Suspense fallback={<Loading />}>
        <Home />
      </Suspense>
    ),
    index: true,
    accessLevel: [0, 1, 2, 3]
  }
]

export default routes
