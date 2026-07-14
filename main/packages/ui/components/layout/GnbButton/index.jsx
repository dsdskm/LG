import { useLocation } from 'react-router-dom'
import { useSideBarStore } from '@repo/stores'
import Icon from '../../common/Icon'
import { StyledGnbButton, StyledGnbLink, StyledGnbExternalLink } from './styles'
import { memo } from 'react'
import { getAppPrefix } from '@repo/utils'

const GnbButton = ({ as = 'NavLink', name, icon, path, depthLevel = 0, prefix, onClick, hideIcon = false }) => {
  const location = useLocation()
  const { pathname } = location
  const { compactSideBar, openDepth, setOpenDepth } = useSideBarStore()

  // Use window.location.pathname to get the absolute path from the domain root
  const fullPathname = typeof window !== 'undefined' ? window.location.pathname : pathname

  // Helper to determine if a path is active by ignoring trailing slashes and checking prefixes
  const isReallyActive = (targetPath, itemPrefix) => {
    // 1. Path normalization check
    const normalize = (p) => (p === '/' ? '/' : p.replace(/\/$/, ''))
    const normFull = normalize(fullPathname)
    const normTarget = targetPath ? normalize(targetPath) : null

    if (normTarget) {
      if (normTarget === '/' && normFull === '/') return true
      if (normTarget !== '/' && (normFull === normTarget || normFull.startsWith(normTarget + '/'))) return true
    }

    // 2. Prefix check (for parent menus without direct path)
    if (itemPrefix && normFull.split('/').includes(itemPrefix)) {
      return true
    }

    return false
  }

  const currentAppPrefix = getAppPrefix(fullPathname)
  const targetAppPrefix = path?.startsWith('/') ? getAppPrefix(path) : currentAppPrefix

  // A link is cross-app if its target prefix is different from current app prefix
  const isCrossApp = targetAppPrefix !== currentAppPrefix && path && !path.startsWith('#')

  let finalAs = as
  if (as === 'NavLink' && isCrossApp) {
    finalAs = 'a'
  }

  const Component = finalAs === 'button' ? StyledGnbButton : finalAs === 'a' ? StyledGnbExternalLink : StyledGnbLink

  const active = isReallyActive(path, prefix)

  const props = {
    button: {
      type: 'button',
      className: `typographyButton3 ${openDepth === prefix || active ? 'active' : ''}`,
      onClick: () => {
        setOpenDepth(openDepth === prefix ? null : prefix)
        if (path) {
          window.location.href = path
        }
        if (onClick) {
          onClick()
        }
      },
      $compact: `${compactSideBar}`
    },
    NavLink: {
      to: path,
      className: ({ isActive }) => `typographyButton3 ${isActive || active ? 'active' : ''}`,
      $depth: depthLevel,
      $compact: `${compactSideBar}`,
      onClick: () => {
        if (onClick) {
          onClick()
        }
      }
    },
    a: {
      href: path,
      className: `typographyButton3 ${active ? 'active' : ''}`,
      $depth: depthLevel,
      $compact: `${compactSideBar}`,
      onClick: (e) => {
        if (onClick) {
          onClick()
        }
      }
    }
  }

  const handleDepthClick = (e) => {
    if (depthLevel === 0) {
      if (prefix) {
        setOpenDepth(openDepth === prefix ? null : prefix)
      } else {
        setOpenDepth(null)
      }
    } else {
      if (prefix) {
        setOpenDepth(prefix)
      }
    }
  }

  if (props.NavLink) {
    const originalOnClick = props.NavLink.onClick
    props.NavLink.onClick = (e) => {
      handleDepthClick(e)
      if (originalOnClick) originalOnClick(e)
    }
  }

  if (props.a) {
    const originalOnClick = props.a.onClick
    props.a.onClick = (e) => {
      handleDepthClick(e)
      if (originalOnClick) originalOnClick(e)
    }
  }

  return (
    <Component {...props[finalAs]}>
      {icon && !hideIcon && <Icon name={icon} size={depthLevel === 0 ? 32 : 24} />}
      {(depthLevel === 0 && !compactSideBar) || depthLevel === 1 ? name : null}
    </Component>
  )
}

export default memo(GnbButton)
