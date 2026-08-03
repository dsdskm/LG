import { Link } from 'react-router-dom'
import SvgLogo from '../../../assets/svgs/logo.svg'
import { useResponsiveStore } from '@repo/stores/useResponsiveStore'
import { useState } from 'react'

const originalLogoWidth = 120
const originalLogoHeight = 25

function Logo({ disableLink = false }) {
  const { responsiveMode } = useResponsiveStore()
  const [clickCount, setClickCount] = useState(0)
  const isMobileOnly = responsiveMode === 'MOBILE'
  const logoWidth = isMobileOnly ? 25 : originalLogoWidth
  const logoHeight = 25
  const baseUrl = (import.meta.env && import.meta.env.VITE_PORTAL_BASE_URL) || '/'

  const handleLogoClick = () => {
    if (typeof window === 'undefined') {
      return
    }
    if (responsiveMode !== 'PC' && !disableLink) {
      setClickCount((prevCount) => prevCount + 1)
      if (clickCount + 1 === 5) {
        window?.location.replace(`${baseUrl}/`)
      }
    }
  }

  const LogoContent = () => (
    <SvgLogo
      width={logoWidth}
      height={logoHeight}
      viewBox={isMobileOnly ? '0 0 25 25' : '0 0 134 25'}
    />
  )

  return (
    <h1 className="logo">
      {disableLink ? (
        <LogoContent />
      ) : (
        <>
          {responsiveMode === 'PC' ? (
            <Link to="/">
              <LogoContent />
            </Link>
          ) : (
            <div onClick={handleLogoClick}>
              <LogoContent />
            </div>
          )}
        </>
      )}
    </h1>
  )
}

export default Logo
