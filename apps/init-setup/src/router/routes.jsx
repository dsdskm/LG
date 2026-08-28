import { Navigate } from 'react-router-dom'
import Map from '@/pages/Map'
import Semantic from '@/pages/Map/Semantic'
import Language from '@/pages/Default/Language'
import Network from '@/pages/Default/Network'
import SiteCode from '@/pages/Default/SiteCode'
import RobotInfo from '@/pages/Default/RobotInfo'
import Location from '@/pages/Default/Location'
import Terms from '@/pages/Default/Terms'
import Download from '@/pages/Download'
import Upload from '@/pages/Upload'
import Login from '@/pages/Login'
import Admin from '@/pages/Admin'
import Version from '@/pages/Version'
import RootGuard from '@/components/RootGuard'
import AdminGuard from '@/components/AdminGuard'
import { USER_ROLE_LEVEL } from '@repo/constants'

// 사이드바 메뉴는 세 그룹으로 나뉘고, 헤더 탭이 그룹을 전환한다.
// - initialSetup: 언어 설정 ~ 서비스 이용약관 (로봇 최초 설치 단계)
// - mapSetup: 지도 ~ 업로드 (맵 스캔/시맨틱/업로드 단계)
// - admin: DB 데이터 브라우저. 사이드바 항목은 고정 목록이 아니라 GET /admin/schema 로 받은
//   테이블 목록이라 App 에서 런타임에 만든다 (여기서는 라우트만 정의).
// robotSetup.status === 'completed'(= 마지막 단계인 업로드까지 끝낸 전역 완료)이면 initialSetup 그룹은
// 탭/사이드바/라우트에서 모두 제거되고(App.jsx) 단계 순서 잠금도 풀린다.
// 그 전에는 currentStep(작업 중인 단계)까지만 열린다 — 아래 getSetupProgress.
export const SETUP_GROUP = {
  INITIAL: 'initialSetup',
  MAP: 'mapSetup',
  ADMIN: 'admin'
}

export const HEADER_GNB = [
  { name: SETUP_GROUP.INITIAL, path: '/language', prefix: '', group: SETUP_GROUP.INITIAL },
  { name: SETUP_GROUP.MAP, path: '/download', prefix: '', group: SETUP_GROUP.MAP },
  // admin 탭은 SYSTEM_MANAGER 이상만 본다 (라우트 접근 제한은 AdminGuard 가 담당).
  {
    name: SETUP_GROUP.ADMIN,
    path: '/admin',
    prefix: '',
    group: SETUP_GROUP.ADMIN,
    minUserLevel: USER_ROLE_LEVEL.SYSTEM_MANAGER
  }
]

export const appRoutes = [
  {
    name: 'language',
    path: '/language',
    prefix: '',
    icon: 'language',
    group: SETUP_GROUP.INITIAL,
    element: <Language />
  },
  {
    name: 'network',
    path: '/network',
    prefix: '',
    icon: 'link',
    group: SETUP_GROUP.INITIAL,
    element: <Network />
  },
  {
    name: 'siteCode',
    path: '/site-code',
    prefix: '',
    icon: 'site_management',
    group: SETUP_GROUP.INITIAL,
    element: <SiteCode />
  },
  {
    name: 'location',
    path: '/location',
    prefix: '',
    icon: 'location',
    group: SETUP_GROUP.INITIAL,
    element: <Location />
  },
  {
    name: 'robotInfo',
    path: '/robot-info',
    prefix: '',
    icon: 'robot',
    group: SETUP_GROUP.INITIAL,
    element: <RobotInfo />
  },
  {
    name: 'terms',
    path: '/terms',
    prefix: '',
    icon: 'policy',
    group: SETUP_GROUP.INITIAL,
    // TODO: 약관 적용 시 다시 노출. 현재는 기능/라우트는 유지하고 메뉴에서만 숨긴다.
    hide: true,
    element: <Terms />
  },
  {
    name: 'download',
    path: '/download',
    prefix: '',
    icon: 'download',
    group: SETUP_GROUP.MAP,
    element: <Download />
  },
  {
    name: 'map',
    prefix: '',
    icon: 'map',
    group: SETUP_GROUP.MAP,
    depth: [
      {
        name: 'scan',
        path: '/map/scan',
        prefix: '',
        element: <Map />
      },
      {
        name: 'semantic',
        path: '/map/semantic',
        prefix: '',
        element: <Semantic />
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
    group: SETUP_GROUP.MAP,
    element: <Upload />
  },
  {
    // DB 데이터 브라우저. hide: true — 사이드바 항목은 이 라우트가 아니라 스키마 목록으로 그린다.
    // 접근 권한 제한은 AdminGuard 가 담당.
    name: 'admin',
    path: '/admin',
    prefix: '',
    icon: 'settings',
    hide: true,
    group: SETUP_GROUP.ADMIN,
    element: (
      <AdminGuard>
        <Admin />
      </AdminGuard>
    )
  },
  {
    // 버전 확인용 진단 페이지. group 없음 + hide: true 로 헤더 탭/사이드바에서 빠지고,
    // hideLayout: true 라 설치 단계 게이트(SetupOrderModal)도 타지 않는다 — 셋업 진행 중에도
    // URL 직접 진입으로 열 수 있다.
    name: 'version',
    path: '/version',
    prefix: '',
    hide: true,
    hideLayout: true,
    element: <Version />
  },
  {
    // /admin/:resource — 사이드바에서 선택한 테이블. 화면은 /admin 과 같다.
    name: 'adminResource',
    path: '/admin/:resource',
    prefix: '',
    hide: true,
    group: SETUP_GROUP.ADMIN,
    element: (
      <AdminGuard>
        <Admin />
      </AdminGuard>
    )
  }
]
export const getAppPrefix = (pathname) => {
  return pathname.split('/').filter(Boolean)[0] || ''
}

/**
 * @param {object[]} routes 트리 형태의 라우트 목록
 * @param {React.ReactNode} [rootElement] '/' 에 붙일 엘리먼트.
 *   App 은 셋업 진행 상태를 알고 있으므로 착지 경로를 주입한 RootGuard 를 넘긴다.
 */
export const flattenRoutes = (routes, rootElement = <RootGuard />) => {
  // 하위 메뉴(depth)는 부모의 group 을 물려받는다 — 헤더 탭 / 사이드바 필터가 group 으로 동작하므로
  // /map/scan 같은 자식 경로에서도 소속 그룹을 알 수 있어야 한다.
  const flatten = (items, parentGroup) =>
    items.reduce((acc, route) => {
      const { depth, ...rest } = route
      const group = rest.group ?? parentGroup
      acc.push({ ...rest, ...(group && { group }) })
      return depth ? [...acc, ...flatten(depth, group)] : acc
    }, [])

  return [...flatten(routes), { name: '', path: '/', prefix: '', hideLayout: true, element: rootElement }]
}

/** 라우트를 한 번만 펼쳐 재사용한다 (단계 순서 계산 · 그룹 판별 공용). */
export const FLAT_APP_ROUTES = flattenRoutes(appRoutes)

const stepRoutesOf = (group) => FLAT_APP_ROUTES.filter((route) => route.group === group && route.path)

/**
 * 설치 단계 순서. 초기 설정(언어 설정 ~ 서비스 이용약관) 다음에 맵 설정(스캔 · 시맨틱 · 업로드)이 온다.
 * robotSetup.currentStep 은 이 목록의 1-based 위치로 해석한다 — 그룹별로 진행 상태를 따로 저장하는
 * 필드가 없으므로 전체를 하나의 위저드 순서로 본다.
 */
export const INITIAL_STEP_ROUTES = stepRoutesOf(SETUP_GROUP.INITIAL)
export const MAP_STEP_ROUTES = stepRoutesOf(SETUP_GROUP.MAP)
export const SETUP_STEP_ROUTES = [...INITIAL_STEP_ROUTES, ...MAP_STEP_ROUTES]

const NO_LOCKED_PATHS = new Set()

/**
 * 단계 진행 상태. currentStep 까지는 열려 있고(=이미 지난 단계로 되돌아가기 허용) 그 뒤는 잠긴다.
 * @param {object|null} setup robotSetup 레코드
 * @param {{completed?: boolean, enforce?: boolean}} [options]
 *   completed: 셋업 완료(전부 허용) / enforce: false 면 순서 강제를 끈다
 * @returns {{ pendingStep: object|null, lockedPaths: Set<string> }}
 *   pendingStep: 지금 진행해야 할 단계 (잠긴 단계를 눌렀을 때 안내할 목적지)
 */
export const getSetupProgress = (setup, { completed = false, enforce = true } = {}) => {
  if (completed || !enforce) {
    return { pendingStep: null, lockedPaths: NO_LOCKED_PATHS }
  }
  const step = Number(setup?.currentStep)
  // 값이 없으면 첫 단계만 열어 둔다.
  const unlockedCount = Number.isFinite(step) && step > 0 ? Math.min(step, SETUP_STEP_ROUTES.length) : 1
  return {
    pendingStep: SETUP_STEP_ROUTES[unlockedCount - 1] || SETUP_STEP_ROUTES[0],
    lockedPaths: new Set(SETUP_STEP_ROUTES.slice(unlockedCount).map((route) => route.path))
  }
}

/**
 * 앱 진입 시 착지할 경로. 저장된 robotSetup.currentStep 을 SETUP_STEP_ROUTES 의 1-based 위치로
 * 해석해 '지금 작업 중인 단계' 화면으로 바로 보낸다.
 * - 셋업 완료: 초기 설정 그룹이 제거되므로 맵 설정 첫 화면
 * - currentStep 없음/비정상: 첫 단계 (뒤 단계를 건너뛰게 만드는 것보다 안전하다)
 * 순서 강제(enforce) 여부와 무관하게 같은 경로를 쓴다 — 강제를 꺼도 진행 중 단계에서 이어받는 게 맞다.
 * @param {object|null} setup robotSetup 레코드
 * @param {{completed?: boolean}} [options]
 * @returns {string|undefined}
 */
export const getSetupLandingPath = (setup, { completed = false } = {}) => {
  if (completed) return MAP_STEP_ROUTES[0]?.path
  const step = Number(setup?.currentStep)
  const index = Number.isFinite(step) && step > 0 ? Math.min(step, SETUP_STEP_ROUTES.length) - 1 : 0
  return SETUP_STEP_ROUTES[index]?.path
}

/** pathname 이 속한 그룹을 찾는다 (플랫하게 펼친 라우트 기준). */
export const getRouteGroup = (routes, pathname) => {
  const match = routes.find(
    ({ path }) => path && path !== '/' && (pathname === path || pathname.startsWith(`${path}/`))
  )
  return match?.group
}
