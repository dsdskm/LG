import { useSideBarStore } from '@repo/stores'
import { LanguageSelect } from '@repo/ui'
import { StyledHeader, StyledHeaderButton } from '@repo/ui/components/layout/Header/styles'
import { StyledNavButton } from '@repo/ui/components/layout/ServiceMenuIcon/styles'
import SvgMenu from '@repo/ui/assets/svgs/menu.svg'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { HEADER_GNB, getRouteGroup, FLAT_APP_ROUTES } from '@/router/routes'
import SetupOrderModal from '../SetupOrderModal'

// 헤더 탭은 같은 앱 안의 메뉴 그룹 전환이므로 SPA 네비게이션으로 이동한다.
// (공용 ServiceMenuIcon 은 앱 간 이동용이라 window.location.href 로 전체 리로드를 한다)
const GroupTabs = ({ tabs, t }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setCompactSideBar } = useSideBarStore()
  const activeGroup = getRouteGroup(FLAT_APP_ROUTES, pathname)
  // 선행 단계가 남아 클릭이 막힌 탭 (locked). 현재 화면은 그대로 두고 안내 모달만 띄운다.
  const [blockedTab, setBlockedTab] = useState(null)

  if (tabs.length < 2) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'nowrap', minWidth: 0 }}>
      {tabs.map((tab) => (
        <StyledNavButton
          key={tab.name}
          type="button"
          className="typographyHeading6"
          $isActive={tab.group === activeGroup}
          onClick={() => {
            if (tab.locked) {
              setBlockedTab(tab)
              return
            }
            if (typeof window !== 'undefined' && window.innerWidth <= 767) {
              setCompactSideBar(true)
            }
            navigate(tab.path)
          }}
        >
          {t(`SideBar.gnb.${tab.name}`)}
        </StyledNavButton>
      ))}
      {blockedTab && (
        <SetupOrderModal
          isOpen
          pendingPath={blockedTab.pendingPath}
          pendingLabel={blockedTab.pendingLabel}
          onClose={() => setBlockedTab(null)}
        />
      )}
    </div>
  )
}

const CustomHeader = ({ headerRoutes = HEADER_GNB }) => {
  const { toggleSideBar } = useSideBarStore()
  const { t } = useTranslation('route')

  return (
    <StyledHeader className="header">
      <div className="containerHeader">
        <div className="content left">
          <StyledHeaderButton type="button" onClick={toggleSideBar} aria-label="Open Sidebar" className="hideOnMobile">
            <SvgMenu />
          </StyledHeaderButton>
          <Logo />
          <GroupTabs tabs={headerRoutes} t={t} />
        </div>
        <div className="content right">
          <LanguageSelect />
        </div>
      </div>
    </StyledHeader>
  )
}

export default CustomHeader
