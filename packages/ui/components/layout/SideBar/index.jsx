import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { StyledGnb, StyledGnbItem, StyledGnbTooltip } from './styles'
import { useSideBarStore, useUserStore, useResponsiveStore } from '@repo/stores'
import GnbButton from '../GnbButton'
import { memo, useEffect } from 'react'

const SideBar = ({ routes, t }) => {
  const { session } = useUserStore.getState()
  const userLevel = Number(session?.userLevel) || 0
  const { gnb } = routes
  const { compactSideBar, openDepth, setCompactSideBar } = useSideBarStore()
  const { responsiveMode } = useResponsiveStore()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (window.innerWidth <= 767) {
      setCompactSideBar(true)
    }
  }, [setCompactSideBar])

  const DepthList = memo(({ depth, prefix, userLevel, t }) => (
    <ul className="gnbList">
      {depth
        .filter((item) => !item.hide)
        .map(
          ({ name, path, icon, accessLevel, hideIcon }) =>
            (accessLevel?.includes(userLevel) || !accessLevel) && (
              <StyledGnbItem key={name}>
                <GnbButton
                  depthLevel={1}
                  name={t(`SideBar.gnb.${name}`)}
                  icon={icon}
                  hideIcon={hideIcon}
                  path={path}
                  prefix={prefix}
                  onClick={() => {
                    if (window.innerWidth <= 767) {
                      useSideBarStore.getState().setCompactSideBar(true)
                    }
                  }}
                />
              </StyledGnbItem>
            )
        )}
    </ul>
  ))

  return (
    <StyledGnb className="sideBar" $compact={compactSideBar}>
      <ul>
        {gnb
          ?.filter((item) => !item.hide)
          .map(
            ({ name, icon, path, depth, prefix, accessLevel, hideIcon }) =>
              (icon || name) &&
              (accessLevel?.includes(userLevel) || !accessLevel) && (
                <StyledGnbItem key={name}>
                  {depth ? (
                    <>
                      <GnbButton
                        as={path ? 'NavLink' : 'button'}
                        icon={icon}
                        hideIcon={hideIcon}
                        name={t(`SideBar.gnb.${name}`)}
                        prefix={name}
                        path={path}
                      />
                      {!compactSideBar && openDepth === name && (
                        <DepthList depth={depth} prefix={name} userLevel={userLevel} t={t} />
                      )}
                      {compactSideBar && (
                        <StyledGnbTooltip className="gnbTooltip">
                          <div className="content">
                            <h2 className="tooltipTitle typographyHeading6">{t(`SideBar.gnb.${name}`)}</h2>
                            <DepthList depth={depth} prefix={name} userLevel={userLevel} t={t} />
                          </div>
                        </StyledGnbTooltip>
                      )}
                    </>
                  ) : (
                    <>
                      <GnbButton
                        as={path ? 'NavLink' : 'button'}
                        icon={icon}
                        hideIcon={hideIcon}
                        name={t(`SideBar.gnb.${name}`)}
                        prefix={prefix}
                        path={path}
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth <= 767) {
                            setCompactSideBar(true)
                          }
                        }}
                      />
                      {compactSideBar && (
                        <StyledGnbTooltip className="gnbTooltip">
                          <div className="content">
                            <Link
                              to={path}
                              className="tooltipTitle typographyHeading6"
                              onClick={() => {
                                if (typeof window !== 'undefined' && window.innerWidth <= 767) {
                                  setCompactSideBar(true)
                                }
                              }}
                            >
                              {t(`SideBar.gnb.${name}`)}
                            </Link>
                          </div>
                        </StyledGnbTooltip>
                      )}
                    </>
                  )}
                </StyledGnbItem>
              )
          )}
      </ul>
    </StyledGnb>
  )
}

const Version = styled.div`
  bottom: 10px;
  left: 10px;
  position: absolute;
  font-size: 12px;
`

export default SideBar
