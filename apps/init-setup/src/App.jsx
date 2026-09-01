import React, { useMemo, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import {
  appRoutes,
  getAppPrefix,
  flattenRoutes,
  getSetupProgress,
  getSetupLandingPath,
  HEADER_GNB,
  SETUP_GROUP
} from './router/routes'
import RootGuard from './components/RootGuard'
import useRobotSetupStatus from './hooks/useRobotSetupStatus'
import useNetworkGate, { NETWORK_SETUP_PATH } from './hooks/useNetworkGate'
import useAdminSchemas from './hooks/useAdminSchemas'
import { createGlobalStyle } from 'styled-components'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast } from '@repo/ui'
import { useUserStore } from '@repo/stores'
import { USER_ROLE_LEVEL } from '@repo/constants'
import 'react-toastify/dist/ReactToastify.css'

// 공용 MainLayout(@repo/ui) 의 MainContent 는 padding: 20px 을 갖는다.
// init-setup 은 화면 가장자리까지 꽉 채워 쓰므로 이 앱에서만 여백을 제거한다.
// (공용 패키지는 다른 앱들도 함께 쓰기 때문에 수정하지 않는다)
const AppGlobalStyle = createGlobalStyle`
  #mainContent {
    padding: 0;
  }
`

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])
  // 셋업 완료(status 'completed' = 마지막 단계인 업로드까지 끝냄) 여부로
  // 초기 설정 그룹 노출 · 단계 순서 잠금 · 기본 착지점을 결정한다.
  // 완료 이력은 되돌아가지 않으므로(utils/setupProgress) 완료 후 맵을 다시 스캔해도 그대로 유지된다.
  const { loading: setupLoading, completed: setupCompleted, setup } = useRobotSetupStatus()
  // 로봇이 외부 네트워크에 붙기 전에는 로그인이 불가능하므로 네트워크 설정 화면이 가장 먼저 온다.
  // 여기서는 그 상태를 착지 경로 · 단계 잠금에 반영한다(경로 이동은 RootGuard · NetworkGuard).
  const { loading: networkLoading, blocked: networkBlocked } = useNetworkGate()

  const processedAppRoutes = useMemo(() => {
    const processRoutes = (routes) => {
      return routes.map((route) => {
        return {
          ...route,
          ...(route.depth && { depth: processRoutes(route.depth) })
        }
      })
    }

    return processRoutes(appRoutes)
  }, [])

  // 셋업을 완료한 로봇은 초기 설정 그룹을 탭 · 사이드바 · 라우트에서 모두 제거한다 — 설치가 끝난 뒤에는
  // 언어/네트워크/지점 같은 최초 설치 항목을 다시 밟을 일이 없다(맵은 언제든 다시 스캔할 수 있다).
  // 제거된 경로로 직접 들어오면 Router 의 catch-all 이 landingPath 로 되돌린다.
  const visibleAppRoutes = useMemo(
    () =>
      setupCompleted ? processedAppRoutes.filter((route) => route.group !== SETUP_GROUP.INITIAL) : processedAppRoutes,
    [processedAppRoutes, setupCompleted]
  )

  // admin 탭은 SYSTEM_MANAGER 이상만 본다. 세션이 바뀌면 탭도 따라가야 하므로 store 를 구독한다.
  const userLevel = useUserStore((state) => state.session?.userLevel)
  const canUseAdmin = (Number(userLevel) || 0) >= USER_ROLE_LEVEL.SYSTEM_MANAGER

  // 설치 단계 순서 강제. currentStep 까지는 열려 있고(이미 끝낸 단계로 되돌아가기 허용)
  // 그 뒤 단계는 초기 설정 · 맵 설정 안에서도 모두 잠긴다.
  // 잠긴 경로는 탭 클릭 / 사이드바 클릭 / URL 직접 진입 모두 SetupOrderModal 로 막는다.
  // VITE_ENFORCE_SETUP_ORDER=false 면 순서 강제를 끈다. 값이 없으면 강제(안전한 기본값).
  const enforceSetupOrder = import.meta.env.VITE_ENFORCE_SETUP_ORDER !== 'false'
  // 네트워크(Wi-Fi) 설정은 설치 단계 목록에서 빠져 있어(routes.jsx SETUP_GROUP.NETWORK) 여기서
  // 따로 잠금을 풀어 줄 필요가 없다 — 헤더 · 로그인 화면의 Wi-Fi 아이콘으로 언제든 들어갈 수 있다.
  const { pendingStep, lockedPaths } = useMemo(
    () => getSetupProgress(setup, { completed: setupCompleted, enforce: enforceSetupOrder }),
    [setup, setupCompleted, enforceSetupOrder]
  )
  const gate = useMemo(
    () =>
      pendingStep ? { pendingPath: pendingStep.path, pendingLabel: appT(`SideBar.gnb.${pendingStep.name}`) } : null,
    [pendingStep, appT]
  )

  const headerRoutes = useMemo(
    () =>
      HEADER_GNB.filter(
        (tab) =>
          (tab.minUserLevel === undefined || (Number(userLevel) || 0) >= tab.minUserLevel) &&
          !(setupCompleted && tab.group === SETUP_GROUP.INITIAL)
      ).map((tab) => (gate && lockedPaths.has(tab.path) ? { ...tab, locked: true, ...gate } : tab)),
    [userLevel, gate, lockedPaths, setupCompleted]
  )

  // admin 사이드바는 DB 테이블 목록이라 런타임에 만든다. admin 화면 밖에서는 조회하지 않는다.
  const isAdminArea = pathname.startsWith('/admin')
  const { schemas } = useAdminSchemas(isAdminArea && canUseAdmin)
  const adminSideBarRoutes = useMemo(
    () =>
      schemas.map((schema) => ({
        name: schema.resource,
        path: `/admin/${schema.resource}`,
        prefix: '',
        // DB 테이블 목록이라 공용 아이콘 세트의 'database' 를 모든 항목에 같이 쓴다.
        icon: 'database',
        group: SETUP_GROUP.ADMIN
      })),
    [schemas]
  )
  const groupSideBarRoutes = useMemo(() => ({ [SETUP_GROUP.ADMIN]: adminSideBarRoutes }), [adminSideBarRoutes])

  // 사이드바/탭 라벨용. admin 사이드바 항목은 DB 테이블명이라 번역 키가 없으므로
  // 번역이 없으면(i18next 가 키를 그대로 돌려주면) 마지막 세그먼트를 그대로 쓴다.
  const sideBarT = useMemo(
    () =>
      (key, ...rest) => {
        const translated = appT(key, ...rest)
        return translated === key ? String(key).split('.').pop() : translated
      },
    [appT]
  )

  // 앱 진입('/') · 없는 URL 의 착지점 = 저장된 currentStep 이 가리키는 '작업 중인 단계' 화면.
  // 셋업 조회가 끝난 뒤에만 라우트를 그리므로(아래 setupLoading 가드) 값이 준비된 상태로 내려간다.
  // 네트워크 미연결이면 착지점은 무조건 네트워크 설정 화면이다 — 진행 중인 단계보다 앞선다.
  const setupLandingPath = useMemo(
    () => (networkBlocked ? NETWORK_SETUP_PATH : getSetupLandingPath(setup, { completed: setupCompleted })),
    [setup, setupCompleted, networkBlocked]
  )

  const allRoutes = useMemo(
    () => flattenRoutes(visibleAppRoutes, <RootGuard landingPath={setupLandingPath} />),
    [visibleAppRoutes, setupLandingPath]
  )

  // 상태 조회가 끝나기 전에 라우트를 그리면 완료 여부에 따른 착지점이 순간적으로 달라질 수 있다.
  // /version 은 예외 — BE 가 죽어 셋업 조회가 늦어도 버전은 확인할 수 있어야 한다.
  if ((setupLoading || networkLoading) && pathname !== '/version') {
    return (
      <>
        <GlobalStyle />
        <AppGlobalStyle />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          {layoutT('loading')}
        </div>
      </>
    )
  }

  return (
    <>
      <GlobalStyle />
      <AppGlobalStyle />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router
          allRoutes={allRoutes}
          appPrefix={appPrefix}
          processedAppRoutes={visibleAppRoutes}
          headerRoutes={headerRoutes}
          groupSideBarRoutes={groupSideBarRoutes}
          lockedPaths={lockedPaths}
          gate={gate}
          // 없는 URL의 착지점.
          // 진행 중인 단계로 보내고, 계산이 불가하면 설치 플로우 첫 탭으로 떨어뜨린다 (admin 은 제외).
          landingPath={
            setupLandingPath || headerRoutes.find((tab) => tab.group !== SETUP_GROUP.ADMIN)?.path || '/login'
          }
          appT={sideBarT}
        />
      </Suspense>
    </>
  )
}

export default App
