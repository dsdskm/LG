import { useSideBarStore } from '@repo/stores'
import { ServiceMenuIcon, LanguageSelect } from '@repo/ui'
import { StyledHeader, StyledHeaderButton } from '@repo/ui/components/layout/Header/styles'
import SvgMenu from '@repo/ui/assets/svgs/menu.svg'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import { HEADER_GNB } from '@/router/routes'

const CustomHeader = () => {
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
          <ServiceMenuIcon headerRoutes={HEADER_GNB} t={t} />
        </div>
        <div className="content right">
          <LanguageSelect />
        </div>
      </div>
    </StyledHeader>
  )
}

export default CustomHeader
