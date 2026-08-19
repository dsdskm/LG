import { Battery, Navigation, Hand, Bot, Activity, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import type { DeployStatus, RobotInfo } from '../../../types/RobotInfo'
import { getRunningTaskFlowStatusLabel } from '@/utils/taskflowStatus'
import { Div } from '@/assets'

// export type RobotItem =
//   | { type: 'groupSection'; key: string; label: string; deployable: boolean }
//   | { type: 'groupHeader'; key: string; groupName: string; siteName: string }
//   | { type: 'robot'; key: string; robot: RobotInfo }

type RobotItemProps = {
  robot: RobotInfo
  checked: boolean
  isDisabled: boolean
  disabledReason?: string
  displaySpec?: boolean
  displayTaskFlow?: boolean
  deployStatus?: DeployStatus
  onChangeCheckbox?: (robot: RobotInfo) => void
  onClick?: (robotId: string) => void
  onClickControl?: (robotId: string) => void
  showControlButton?: boolean
}

const RobotItem = ({
  robot,
  checked,
  isDisabled,
  disabledReason,
  displaySpec,
  displayTaskFlow,
  deployStatus,
  onChangeCheckbox,
  onClick,
  onClickControl,
  showControlButton = false
}: RobotItemProps) => {
  const { t } = useTranslation(['tms', 'common'])
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 640px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const onChange = () => {
      setIsNarrowScreen(mediaQuery.matches)
    }

    onChange()
    mediaQuery.addEventListener('change', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
    }
  }, [])

  console.log('deployStatus', deployStatus)
  const onChange = () => {
    if (onChangeCheckbox) onChangeCheckbox(robot)
  }

  const onClickItem = () => {
    if (onClick) {
      onClick(robot.id)
    }
  }

  const onClickControlItem = () => {
    if (onClickControl) {
      onClickControl(robot.id)
    }
  }

  return (
    <div
      key={robot.id}
      style={{
        textAlign: 'start',
        border: '1.5px solid #ebedf0',
        borderRadius: '8px',
        backgroundColor: 'white',
        padding: '10px 16px',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: isNarrowScreen ? 'flex-start' : 'center',
          gap: isNarrowScreen ? '12px' : '24px'
        }}
      >
        {onChangeCheckbox && (
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={isDisabled}
            style={{
              marginTop: '4px',
              height: '16px',
              width: '16px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1
            }}
          />
        )}
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              height: '64px',
              width: '64px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb'
            }}
          >
            <Bot size={32} color="#4b5563" />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: isNarrowScreen ? 'column' : 'row',
            gap: isNarrowScreen ? '8px' : 0,
            alignItems: isNarrowScreen ? 'stretch' : 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ flex: 1, width: isNarrowScreen ? '100%' : 'auto' }}>
            <div
              style={{
                flexWrap: 'wrap',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontWeight: 600,
                  color: '#1f2937',
                  fontSize: '16px'
                }}
              >
                {robot.name}
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px'
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Activity size={14} color={robot.status === 'STANDBY' ? '#16a34a' : '#9ca3af'} />
                  <span
                    style={{
                      color: robot.status === 'STANDBY' ? '#16a34a' : '#9ca3af'
                    }}
                  >
                    {robot.status}
                  </span>
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Battery
                    size={14}
                    color={robot.batteryLevel > 60 ? '#16a34a' : robot.batteryLevel > 20 ? '#d97706' : '#dc2626'}
                  />
                  <span
                    style={{
                      color: robot.batteryLevel > 60 ? '#16a34a' : robot.batteryLevel > 20 ? '#d97706' : '#dc2626'
                    }}
                  >
                    {robot.batteryLevel}%
                  </span>
                </span>
              </div>
            </div>
       
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4b5563'
              }}
            >
              <div
                style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: '10px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'row', minWidth: 0, flex: '0 1 auto' }}>
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{t('common:group')}:</span>
                  <span
                    style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {robot.group?.length > 0 ? robot.group : t('deploy.robot.unassigned')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', minWidth: 0, flex: '0 1 auto' }}>
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{t('common:site')}:</span>
                  <span
                    style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {robot.site?.length > 0 ? robot.site : t('deploy.robot.unassigned')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', minWidth: 0, flex: '0 1 auto' }}>
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>로봇ID:</span>
                  <span
                    style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {robot.id}
                  </span>
                </div>

                {displaySpec && (
                  <>
                    <Div />
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                      <span>{t('deploy.robot.supportedSkills')}:</span>
                      {robot.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {skill === 'NAVIGATION' ? (
                            <>
                              <Navigation size={14} color="#2563eb" />
                              <span>{t('deploy.skill.navigation')}</span>
                            </>
                          ) : (
                            <>
                              <Hand size={14} color="#9333ea" />
                              <span>{t('deploy.skill.manipulation')}</span>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {displayTaskFlow && (
                  <>
                    <Div />
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                      <span>{t('robots.installedCount')}:</span>
                      <span style={{ color: '#9ca3af' }}>{robot.installedTaskFlowCount ?? 0}</span>
                    </div>
                    {robot.runningTaskFlowName && (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                        <span>{t('robots.recentRun')}:</span>
                        <span style={{ color: '#9ca3af' }}>
                          {robot.runningTaskFlowName}
                          {robot.runningTaskFlowStatus
                            ? ` (${getRunningTaskFlowStatusLabel(robot.runningTaskFlowStatus, t)})`
                            : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {isDisabled && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#dc2626'
              }}
            >
              <AlertCircle size={16} />
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{t('deploy.robot.notDeployable')}</p>
                <p style={{ margin: 0 }}>- {disabledReason}</p>
              </div>
            </div>
          )}
          {deployStatus && (
            <div
              style={{
                marginLeft: 10,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <p>v{`${deployStatus.taskFlowVersion} ${deployStatus.status}`}</p>
            </div>
          )}
          {(onClick || (showControlButton && onClickControl)) && (
            <div
              style={{
                marginLeft: isNarrowScreen ? 0 : 10,
                width: isNarrowScreen ? '100%' : 'auto',
                display: 'flex',
                flexDirection: isNarrowScreen ? 'row' : 'column',
                alignItems: isNarrowScreen ? 'center' : 'stretch',
                justifyContent: isNarrowScreen ? 'flex-end' : 'flex-start',
                paddingTop: isNarrowScreen ? '4px' : 0,
                gap: '8px'
              }}
            >
              {onClick && (
                <button
                  style={{
                    backgroundColor: 'white',
                    color: '#383838',
                    border: '1px solid #C0C7D0',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                  onClick={onClickItem}
                >
                  {t('common:detail')}
                </button>
              )}
              {showControlButton && onClickControl && (
                <button
                  style={{
                    backgroundColor: 'white',
                    color: '#383838',
                    border: '1px solid #C0C7D0',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                  onClick={onClickControlItem}
                >
                  {t('robots.controlButton')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RobotItem
