import { Navigate } from 'react-router-dom'
import Campaign from '../pages/Campaign'
import CampaignDetail from '../pages/Campaign/CampaignDetail'
import Artifact from '../pages/Artifact'
import ArtifactDetail from '../pages/Artifact/ArtifactDetail'
import TargetGroup from '../pages/TargetGroup'
import TargetGroupDetail from '../pages/TargetGroup/TargetGroupDetail'
import Policy from '../pages/Policy'
import PolicyDetail from '../pages/Policy/PolicyDetail'
import Organization from '../pages/Organization'
import OrganizationDetail from '../pages/Organization/OrganizationDetail'
import Device from '../pages/Device'
import Approve from '../pages/Management/Approve'
import Request from '../pages/Management/Request'
import Role from '../pages/Management/Role'
import CiCdSettings from '../pages/Settings/CiCd'
import DeviceType from '../pages/Settings/DeviceType'
import DeviceTypeDetail from '../pages/Settings/DeviceType/DeviceTypeDetail'
import Module from '../pages/Settings/Module'
import ModuleDetail from '../pages/Settings/Module/ModuleDetail'
import Action from '../pages/Settings/Action'
import ActionDetail from '../pages/Settings/Action/ActionDetail'
import ApiDoc from '../pages/Settings/ApiDoc'
import IconViewer from '../pages/Settings/IconViewer'

export const getAppRoutes = (company) => [
  {
    name: 'campaign',
    path: '/ota/campaign',
    prefix: 'ota',
    icon: 'campaign',
    hideIcon: false,
    element: <Campaign />,
    depth: [
      {
        name: 'campaignDetail',
        hide: true,
        hasBack: true,
        path: '/ota/campaign/detail/:id?',
        prefix: 'ota',
        icon: 'campaign',
        element: <CampaignDetail />
      }
    ]
  },
  {
    name: 'artifact',
    path: '/ota/artifact',
    prefix: 'ota',
    icon: 'file',
    hideIcon: false,
    element: <Artifact />,
    depth: [
      {
        name: 'artifactDetail',
        hide: true,
        hasBack: true,
        path: '/ota/artifact/detail/:id?',
        prefix: 'ota',
        icon: 'file',
        hideIcon: false,
        element: <ArtifactDetail />
      }
    ]
  },
  {
    name: 'targetGroup',
    path: '/ota/target-group',
    prefix: 'ota',
    icon: 'group',
    hideIcon: false,
    element: <TargetGroup />,
    depth: [
      {
        name: 'targetGroupDetail',
        hide: true,
        hasBack: true,
        path: '/ota/target-group/detail/:id?',
        prefix: 'ota',
        icon: 'group',
        hideIcon: false,
        element: <TargetGroupDetail />
      }
    ]
  },
  {
    name: 'policy',
    path: '/ota/policy',
    prefix: 'ota',
    icon: 'policy',
    hideIcon: false,
    element: <Policy />,
    depth: [
      {
        name: 'actionDetail',
        hide: true,
        hasBack: true,
        path: '/ota/policy/detail/:id?',
        prefix: 'ota',
        icon: 'policy',
        hideIcon: false,
        element: <PolicyDetail />
      }
    ]
  },
  {
    name: 'organization',
    path: '/ota/organization',
    prefix: 'ota',
    icon: 'workspace',
    hideIcon: false,
    showForGroupManager: true,
    hide: company?.orgLinkage,
    element: <Organization />,
    depth: [
      {
        name: 'organizationDetail',
        hide: true,
        hasBack: true,
        path: '/ota/organization/detail/:id?',
        prefix: 'ota',
        icon: 'workspace',
        hideIcon: false,
        element: <OrganizationDetail />
      }
    ]
  },
  {
    name: 'management',
    prefix: 'management',
    icon: 'widget',
    hideIcon: false,
    hide: company?.orgLinkage,
    showForGroupManager: true,
    depth: [
      {
        name: 'approve',
        path: '/ota/management/approve',
        prefix: 'management',
        icon: 'check',
        showForGroupManager: true,
        hide: company?.orgLinkage,
        element: <Approve />
      },
      {
        name: 'request',
        path: '/ota/management/request',
        hide: company?.orgLinkage,
        prefix: 'management',
        icon: 'report',
        element: <Request />
      },
      {
        name: 'role',
        path: '/ota/management/role',
        prefix: 'management',
        icon: 'profile',
        showForGroupManager: true,
        hide: company?.orgLinkage,
        element: <Role />
      }
    ]
  },
  {
    name: 'device',
    path: '/ota/device',
    prefix: 'ota',
    icon: 'device',
    hideIcon: false,
    showForGroupManager: true,
    element: <Device />,
    depth: []
  },
  {
    name: 'settings',
    prefix: 'settings',
    icon: 'settings',
    hideIcon: false,
    depth: [
      {
        name: 'deviceType',
        hasBack: true,
        path: '/ota/settings/device-type/',
        prefix: 'settings',
        icon: 'device',
        element: <DeviceType />
      },
      {
        name: 'deviceType',
        hasBack: true,
        hide: true,
        path: '/ota/settings/device-type/detail/:id?',
        prefix: 'settings',
        element: <DeviceTypeDetail />
      },
      {
        name: 'module',
        hasBack: true,
        path: '/ota/settings/module/',
        prefix: 'settings',
        icon: 'apps',
        element: <Module />
      },
      {
        name: 'module',
        hasBack: true,
        hide: true,
        path: '/ota/settings/module/detail/:id?',
        prefix: 'settings',
        element: <ModuleDetail />
      },
      {
        name: 'action',
        path: '/ota/settings/action',
        prefix: 'settings',
        icon: 'play',
        element: <Action />,
        depth: [
          {
            name: 'actionDetail',
            hide: true,
            hasBack: true,
            path: '/ota/settings/action/detail/:id?',
            prefix: 'settings',
            icon: 'play',
            hideIcon: false,
            element: <ActionDetail />
          }
        ]
      },
      {
        name: 'cicdSetting',
        path: '/ota/settings/cicd',
        prefix: 'settings',
        icon: 'apps',
        showForGroupManager: true,
        element: <CiCdSettings />
      },
      {
        name: 'apiDoc',
        path: '/ota/settings/api-doc',
        prefix: 'settings',
        hide: import.meta.env.VITE_ENV_MODE === 'prod',
        icon: 'report',
        element: <ApiDoc />
      },
      {
        name: 'icons',
        path: '/ota/settings/icons',
        prefix: 'settings',
        hide: import.meta.env.VITE_ENV_MODE !== 'local',
        icon: 'image',
        element: <IconViewer />
      }
    ]
  }
]

export const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || 'ota'
}

export const flattenRoutes = (routes) => {
  let result = []
  routes.forEach((route) => {
    result.push(route)
    if (route.depth) {
      result = [...result, ...flattenRoutes(route.depth)]
    }
  })
  result.push({ name: '', path: '/ota/', prefix: 'ota', element: <Navigate to="/ota/campaign" replace /> })
  return result
}
