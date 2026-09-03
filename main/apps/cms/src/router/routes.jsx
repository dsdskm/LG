import { Navigate } from 'react-router-dom'
import Content from '../pages/Content'
import ContentDetail from '../pages/Content/ContentDetail'
import Label from '../pages/Label'
import LabelDetail from '../pages/Label/LabelDetail'
import Embedding from '../pages/Embedding'
import EmbeddingDocumentDetail from '../pages/Embedding/EmbeddingDocumentDetail'
import EmbeddingVersion from '../pages/Embedding/EmbeddingVersion'
import EmbeddingTest from '../pages/Embedding/EmbeddingTest'
import AgentChat from '../pages/Agent/AgentChat'
import RobotActionList from '../pages/Embedding/RobotActionList'
import RobotActionDetail from '../pages/Embedding/RobotActionDetail'
import ContentType from '../pages/Settings/ContentType'
import ContentTypeDetail from '../pages/Settings/ContentType/ContentTypeDetail'
import Category from '../pages/Settings/Category'
import CategoryDetail from '../pages/Settings/Category/CategoryDetail'
import ApiDoc from '../pages/Settings/ApiDoc'
import Admin from '../pages/Admin'
import TtsTool from '../pages/TtsTool'

export const getAppRoutes = (enabled) => {
  const has = (key) => !!(enabled && typeof enabled.has === 'function' && enabled.has(key))
  return [
    {
      name: 'content',
      path: '/cms/content',
      prefix: 'cms',
      icon: 'content',
      element: <Content />,
      depth: [
        {
          name: 'contentDetail',
          hide: true,
          hasBack: true,
          path: '/cms/content/detail/:id?',
          prefix: 'cms',
          icon: 'content',
          element: <ContentDetail />
        }
      ]
    },
    {
      name: 'ttsTool',
      path: '/cms/tts',
      prefix: 'cms',
      icon: 'music',
      hide: false,
      element: <TtsTool />
    },
    {
      name: 'label',
      hide: true,
      path: '/cms/label',
      prefix: 'cms',
      icon: 'category',
      element: <Label />,
      depth: [
        {
          name: 'labelDetail',
          hide: true,
          hasBack: true,
          path: '/cms/label/detail/:id?',
          prefix: 'cms',
          icon: 'category',
          element: <LabelDetail />
        }
      ]
    },
    {
      name: 'embedding',
      prefix: 'cms',
      icon: 'voice',
      hide: !has('VOICE_CHAT'),
      depth: [
        {
          name: 'embeddingDocs',
          path: '/cms/embedding',
          prefix: 'cms',
          icon: 'file',
          element: <Embedding />
        },
        {
          name: 'embeddingDetail',
          hide: true,
          hasBack: true,
          path: '/cms/embedding/detail/:id?',
          prefix: 'cms',
          icon: 'voice',
          element: <EmbeddingDocumentDetail />
        },
        {
          name: 'embeddingAction',
          path: '/cms/embedding/actions',
          prefix: 'cms',
          icon: 'robot',
          element: <RobotActionList />
        },
        {
          name: 'embeddingActionDetail',
          hide: true,
          hasBack: true,
          path: '/cms/embedding/actions/detail/:id?',
          prefix: 'cms',
          icon: 'robot',
          element: <RobotActionDetail />
        },
        {
          name: 'embeddingTest',
          hasBack: true,
          path: '/cms/embedding/test',
          prefix: 'cms',
          icon: 'message',
          element: <EmbeddingTest />
        },
        {
          name: 'embeddingVersion',
          hasBack: true,
          path: '/cms/embedding/versions',
          prefix: 'cms',
          icon: 'stack',
          element: <EmbeddingVersion />
        }
      ]
    },
    {
      name: 'lab',
      prefix: 'cms',
      icon: 'robot',
      hide: !has('LAB'),
      depth: [
        {
          name: 'agentChat',
          path: '/cms/lab/agent',
          prefix: 'cms',
          icon: 'message',
          element: <AgentChat />
        }
      ]
    },
    {
      name: 'settings',
      // hide: true,
      prefix: 'settings',
      icon: 'settings',
      // accessLevel: 'admin',
      depth: [
        {
          name: 'contentType',
          hide: true,
          path: '/cms/settings/contentType',
          prefix: 'cms',
          icon: 'category',
          element: <ContentType />
        },
        {
          name: 'contentTypeDetail',
          hide: true,
          hasBack: true,
          path: '/cms/settings/contentType/detail/:id?',
          prefix: 'cms',
          icon: 'category',
          element: <ContentTypeDetail />
        },
        {
          name: 'category',
          hasBack: true,
          path: '/cms/settings/category/',
          prefix: 'settings',
          icon: 'apps',
          element: <Category />
        },
        {
          name: 'module',
          hasBack: true,
          hide: true,
          path: '/cms/settings/category/detail/:id?',
          prefix: 'settings',
          element: <CategoryDetail />
        },
        {
          name: 'apiDoc',
          path: '/cms/settings/api-doc',
          prefix: 'settings',
          hide: import.meta.env.VITE_ENV_MODE === 'prod',
          icon: 'report',
          element: <ApiDoc />
        }
      ]
    },
    {
      name: 'admin',
      hide: true,
      path: '/cms/admin',
      prefix: 'cms',
      element: <Admin />
    }
  ]
}

export const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || 'cms'
}

export const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  result.push({ name: '', path: '/cms/', prefix: 'cms', element: <Navigate to="/cms/content" replace /> })
  return result
}
