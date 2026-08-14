import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { MainLayout } from '@repo/ui'
import CustomHeader from '@/components/CustomHeader'
import SetupOrderModal from '@/components/SetupOrderModal'
import { getRouteGroup } from './routes'

/**
 * 레이아웃 라우트의 껍데기. 화면(자식 라우트)은 Outlet 으로 갈아끼운다.
 *
 * 라우트마다 MainLayout 을 따로 만들면 이동할 때 헤더/사이드바/스크롤 영역까지 언마운트-마운트되어
 * 앱이 새로 로딩되는 것처럼 보인다(사이드바 접힘 상태·스크롤 위치도 초기화된다).
 * 레이아웃은 한 번만 마운트하고, 현재 경로가 속한 그룹에 따라 사이드바 목록만 props 로 바꿔준다.
 */
const LayoutShell = ({ allRoutes, appPrefix, processedAppRoutes, headerRoutes, groupSideBarRoutes, t }) => {
  const { pathname } = useLocation()
  const activeGroup = getRouteGroup(allRoutes, pathname)

  // 사이드바는 현재 화면이 속한 그룹(헤더 탭)의 메뉴만 보여준다.
  // groupSideBarRoutes 에 항목이 있는 그룹(admin)은 런타임에 만든 목록을 쓴다.
  const sideBarRoutes = useMemo(
    () =>
      groupSideBarRoutes[activeGroup] ||
      (activeGroup ? processedAppRoutes.filter((route) => route.group === activeGroup) : processedAppRoutes),
    [groupSideBarRoutes, activeGroup, processedAppRoutes]
  )

  return (
    <MainLayout
      currentApp={appPrefix}
      appRoutes={sideBarRoutes}
      headerRoutes={headerRoutes}
      t={t}
      useSubRoutes={false}
      HeaderComponent={CustomHeader}
      // init-setup 은 로봇 최초 설치용이라 AI Assistant 를 쓰지 않는다.
      useAiAssistant={false}
      // 이 앱의 라우트는 모두 루트 직하(/language, /map/scan …)라 첫 세그먼트가 앱 이름이 아니다.
      // 켜두면 사이드바가 매 항목을 '다른 앱' 으로 보고 <a href> 로 브라우저 전체 리로드를 한다.
      crossAppLinks={false}
    >
      <Outlet />
    </MainLayout>
  )
}

const Router = ({
  allRoutes,
  appPrefix,
  processedAppRoutes,
  headerRoutes,
  groupSideBarRoutes = {},
  lockedPaths,
  gate,
  landingPath,
  appT
}) => {
  // hideLayout 라우트(로그인 · '/' 가드 · /version)는 레이아웃 밖에서 단독으로 그린다.
  const bareRoutes = allRoutes.filter((item) => item.hideLayout)
  const layoutRoutes = allRoutes.filter((item) => !item.hideLayout)

  return (
    <Routes>
      {bareRoutes.map((item) => (
        <Route key={item.path} path={item.path} element={item.element} />
      ))}

      <Route
        element={
          <LayoutShell
            allRoutes={allRoutes}
            appPrefix={appPrefix}
            processedAppRoutes={processedAppRoutes}
            headerRoutes={headerRoutes}
            groupSideBarRoutes={groupSideBarRoutes}
            t={appT}
          />
        }
      >
        {layoutRoutes.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              /* 선행 단계가 남아 잠긴 단계는 화면 대신 안내 모달만 띄운다.
                 사이드바 클릭 / URL 직접 진입은 되돌아갈 곳이 없으므로 닫기 없이 이동만 제공한다. */
              gate && lockedPaths?.has(item.path) ? <SetupOrderModal isOpen {...gate} /> : item.element
            }
          />
        ))}
      </Route>

      {/* 셋업 완료로 제거된 초기 설정 경로 등 없는 URL 은 진행 중인 단계로 보낸다 */}
      {landingPath && <Route path="*" element={<Navigate to={landingPath} replace />} />}
    </Routes>
  )
}

export default Router
