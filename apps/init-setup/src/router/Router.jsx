import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@repo/ui'
import CustomHeader from '@/components/CustomHeader'
import SetupOrderModal from '@/components/SetupOrderModal'

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
  return (
    <Routes>
      {allRoutes.map((item) => (
        <Route
          key={item.path}
          path={item.path}
          element={
            item.hideLayout ? (
              item.element
            ) : (
              <MainLayout
                currentApp={appPrefix}
                // 사이드바는 현재 화면이 속한 그룹(헤더 탭)의 메뉴만 보여준다.
                // groupSideBarRoutes 에 항목이 있는 그룹(admin)은 런타임에 만든 목록을 쓴다.
                appRoutes={
                  groupSideBarRoutes[item.group] ||
                  (item.group ? processedAppRoutes.filter((route) => route.group === item.group) : processedAppRoutes)
                }
                headerRoutes={headerRoutes}
                t={appT}
                useSubRoutes={false}
                HeaderComponent={CustomHeader}
                // init-setup 은 로봇 최초 설치용이라 AI Assistant 를 쓰지 않는다.
                useAiAssistant={false}
              >
                {/* 선행 단계가 남아 잠긴 단계는 화면 대신 안내 모달만 띄운다.
                    사이드바 클릭 / URL 직접 진입은 되돌아갈 곳이 없으므로 닫기 없이 이동만 제공한다. */}
                {gate && lockedPaths?.has(item.path) ? <SetupOrderModal isOpen {...gate} /> : item.element}
              </MainLayout>
            )
          }
        />
      ))}
      {/* 셋업 완료로 제거된 초기 설정 경로 등 없는 URL 은 첫 탭으로 보낸다 */}
      {landingPath && <Route path="*" element={<Navigate to={landingPath} replace />} />}
    </Routes>
  )
}

export default Router
