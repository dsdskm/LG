import { useMemo, useState, version } from 'react'
import { useTranslation } from 'react-i18next'
import RobotList from '@/pages/components/robot/RobotList'
import { toRobotInfo } from '@/pages/components/robot/toRobotInfo'
import { Navigation, Hand, Mic, Smile } from 'lucide-react'
import type { DeployStatusType, RobotInfo } from '../../types/RobotInfo'
import { useDeviceList } from '../../api/deviceApis'
import DeployModal from './components/DeployModal'
import { useParams } from 'react-router-dom'

import { StyledPageContent, Title, Tabs, Tab, Dropdown, SearchContainer, Search } from '@repo/ui'
import { useDeployTaskFlowAction, useGetTaskFlow } from '@/api/taskFlowApis'
import { useDeployTaskFlow } from '@/api/deployApis'
import { DeployActionRequest, TaskFlow } from '@/types/taskflow'
import { DeviceParams, DeviceResponse } from '@/types/api/device'
import useSelectInfo from './hooks/useSelectInfo'
import { useGetLatestDeployments } from '@/api/robotDeployApis'
import { Content } from '@/types/api/deviceDeployment'
import { useOrganizationStore } from '@repo/stores'
import { CenteredContent } from '../RobotDetailPage/styles'

const skillRenderMap = {
  MANIPULATION: (
    <>
      <Hand size={14} color="#9333ea" /> 매니플레이션
    </>
  ),
  NAVIGATION: (
    <>
      <Navigation size={14} color="#2563eb" /> 주행
    </>
  ),
  FACE: (
    <>
      <Smile size={14} color="#10b981" /> Face
    </>
  ), // 예시 추가
  VOICE: (
    <>
      <Mic size={14} color="#f59e0b" /> 음성
    </>
  ) // 예시 추가
}

const operationStatusOptions = [
  { value: 'all', name: 'all' },
  { value: 'POWEROFF', name: 'POWEROFF' },
  { value: 'OFFLINE', name: 'OFFLINE' },
  { value: 'ERROR', name: 'ERROR' },
  { value: 'CHARGE', name: 'CHARGE' },
  { value: 'STANDBY', name: 'STANDBY' },
  { value: 'OPERATION', name: 'OPERATION' }
]

const deployStatusOptions = [
  { value: 'all', name: 'all' },
  { value: 'QUEUED', name: 'queued' },
  { value: 'IN_PROGRESS', name: 'in progress' },
  { value: 'SUCCEEDED', name: 'succeeded' },
  { value: 'FAILED', name: 'failed' },
  { value: 'TIMED_OUT', name: 'time out' },
  { value: 'REJECTED', name: 'rejected' },
  { value: 'REMOVED', name: 'removed' },
  { value: 'CANCELED', name: 'canceled' }
]

const makeDeployState = (robotId: string, deployContents: Content[]) => {
  const deployments = deployContents.find((content) => content.robotId === robotId)?.deployments ?? []
  if (deployments.length < 1) {
    return undefined
  }
  const deployment = deployments?.reduce((max, cur) => (max.taskFlowVersion >= cur.taskFlowVersion ? max : cur))
  return {
    taskFlowId: deployment.taskFlowId,
    taskFlowVersion: deployment.taskFlowVersion,
    status: deployment.status as DeployStatusType
  }
}

const makeDeployableInfo = (deployMode: DeployMode, device: DeviceResponse, taskFlow?: TaskFlow | null) => {
  if (deployMode === 'DEPLOY') {
    return checkDeployability(taskFlow, device)
  } else {
    return checkUndeployability(taskFlow, device)
  }
}

//todo
function checkDeployability(taskFlow?: TaskFlow | null, robot?: DeviceResponse) {
  // taskFlow가 필요로 하는 skill과 로봇의 지원 skill이 다를 경우
  // taskFlow가 필요로 하는 action과 로봇의 지원 action이 다를 경우
  // 로봇에 이미 배포 TaskFlow 이상의 TaskFlow가 설치 되어 있을 경우

  if (!taskFlow) return { deployable: false, reason: 'taskflow_missing' }
  if (!robot?.tms) return { deployable: false, reason: 'robot_tms_missing' }

  const capabilities = robot.tms.taskFlowState?.robotSpec?.capabilities ?? []
  const { robotSkillInfos: necessarySkill } = taskFlow

  for (const skill of necessarySkill) {
    if (!capabilities.some((capa) => capa.name === skill.name)) {
      return { deployable: false, reason: `not supported: ${skill.name}` }
    }
  }

  return { deployable: true, reason: 'ok' }
}

function checkUndeployability(taskFlow?: TaskFlow | null, robot?: DeviceResponse) {
  if (!taskFlow || !robot) {
    return
  }
  return { deployable: true, reason: 'ok' }
}

function getRobotForMode(
  deployMode: DeployMode,
  content: DeviceResponse[] | undefined,
  taskFlow?: TaskFlow | null
): DeviceResponse[] {
  if (!content) return []
  if (!taskFlow) return content
  const { id: taskFlowId, version: taskFlowVer } = taskFlow

  const findInstalled = (device: DeviceResponse) =>
    device.tms?.taskFlowState?.taskFlows?.find((tf) => tf.id === taskFlowId)

  if (deployMode === 'DEPLOY') {
    return content.filter((device) => {
      const installed = findInstalled(device)
      return !installed || installed.version < taskFlowVer
    })
  }

  // UNDEPLOY: 동일 id가 깔려 있는 디바이스
  return content.filter((device) => !!findInstalled(device))
}

export type DeployMode = 'DEPLOY' | 'DELETE_DEPLOY'

const DeployPage = () => {
  const { t } = useTranslation(['tms', 'common'])
  const { taskFlowId } = useParams()
  const numericFlowId = Number(taskFlowId)
  const [popup, setPopup] = useState(false)
  const [deployMode, setDeployMode] = useState<DeployMode>('DEPLOY')
  const deploy = useSelectInfo()
  const undeploy = useSelectInfo()
  const active = deployMode === 'DEPLOY' ? deploy : undeploy
  const { selectedOrgs, defaultOrg } = useOrganizationStore()

  const {
    data: taskFlowData,
    error: taskFlowError,
    isLoading: taskFlowLoading,
    isSuccess: tfSuccess
  } = useGetTaskFlow(numericFlowId)

  const deviceRequest = useMemo(() => {
    let nextParams: DeviceParams | undefined = undefined

    console.log('selectedOrgs', selectedOrgs)
    console.log('default Orgs', defaultOrg) // 값 없음 확인 필요
    const [selectedGroupId, selectedSiteId] = selectedOrgs

    if (selectedGroupId !== 'all' || selectedSiteId !== 'all') {
      nextParams = {}
    }

    if (selectedGroupId !== 'all' && selectedGroupId !== 'none') {
      nextParams = {
        ...nextParams,
        groupId: [selectedGroupId ?? 'none']
      }
    }

    if (selectedSiteId !== 'all' && selectedSiteId !== 'none') {
      nextParams = {
        ...nextParams,
        siteId: [selectedSiteId ?? 'none']
      }
    }

    return nextParams
  }, [selectedOrgs])

  const {
    data: devicesData,
    error: devicesError,
    isLoading: devicesLoading,
    isSuccess: dlSuccess
  } = useDeviceList(deviceRequest, tfSuccess)

  const deployInfoRequest = useMemo(() => {
    if (!taskFlowData || !devicesData?.content) {
      return undefined
    }

    return {
      groupId: taskFlowData.groupId,
      siteId: taskFlowData.siteId,
      taskflowId: taskFlowData.id ?? -1
    }
  }, [taskFlowData, devicesData])

  const { data: deployInfo } = useGetLatestDeployments(deployInfoRequest, tfSuccess && dlSuccess)

  console.log('devicesData', devicesData)

  const {
    mutate: deployActionMutate,
    reset: deployActionReset,
    isPending: isDeployActionPending,
    isSuccess: isDeployActionSuccess,
    isError: isDeployActionError
  } = useDeployTaskFlowAction()

  const robotList: RobotInfo[] = useMemo(() => {
    const targetRobots = getRobotForMode(deployMode, devicesData?.content, taskFlowData)
    const buckets: Record<
      'deployable' | 'undeployable',
      Record<string, { groupName: string; siteName: string; robots: RobotInfo[] }>
    > = { deployable: {}, undeployable: {} }

    let robot: RobotInfo

    for (const device of targetRobots) {
      const deployStatus = makeDeployState(device.deviceId, deployInfo?.content ?? [])
      const deployable = makeDeployableInfo(deployMode, device, taskFlowData)
      robot = {
        ...toRobotInfo(device),
        deployable: deployable,
        deployStatus: deployStatus
      }

      const groupName = robot.group ?? t('deploy.unassignedGroup')
      const siteName = robot.site ?? t('deploy.unassignedSite')
      const key = `${groupName}__${siteName}`
      const target = robot.deployable ? buckets.deployable : buckets.undeployable

      if (!target[key]) {
        target[key] = { groupName, siteName, robots: [] }
      }
      target[key].robots.push(robot)
    }

    let result: RobotInfo[] = []
    const appendSection = (deployable: boolean) => {
      const sectionMap = deployable ? buckets.deployable : buckets.undeployable
      const sections = Object.values(sectionMap)
      if (sections.length === 0) return

      // 그룹 정렬: groupName → siteName
      sections
        .sort((a, b) => {
          const g = a.groupName.localeCompare(b.groupName)
          return g !== 0 ? g : a.siteName.localeCompare(b.siteName)
        })
        .forEach((section) => {
          ;[...section.robots]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((robot) => {
              result.push(robot)
            })
        })
    }
    appendSection(true)
    appendSection(false)

    if (active.deployStatusFilter !== 'all') {
      result = result.filter((e) => e.deployStatus?.status === active.deployStatusFilter)
    }

    if (active.operationStatusFilter !== 'all') {
      console.log('active.operationStatusFilter', active.operationStatusFilter)
      result = result.filter((e) => {
        console.log('target status', e.status)
        return e.status === active.operationStatusFilter
      })
    }

    console.log('after result', result)

    return result
  }, [devicesData, deployMode, deployInfo, taskFlowData, active.deployStatusFilter, active.operationStatusFilter, t])

  if (taskFlowLoading || devicesLoading) return <p>Loading...</p>
  if (taskFlowError) return <p>error: {taskFlowError.message}</p>
  if (devicesError) return <p>error: {devicesError.message}</p>

  const onClickDeploy = () => {
    setPopup(true)
    console.log('click deploy')
  }

  const onTabClick = (id: DeployMode) => {
    setDeployMode(id)
    console.log('onTabClick', deployMode)
  }

  const execDeployAction = () => {
    deployActionMutate(makeDeployActionRequest(), {
      onSuccess: (data) => {
        console.log('deploy 성공!', data)
        //dismissPopup()
      },
      onError: (error) => {
        console.error('deploy 실패', error)
        //dismissPopup()
      }
    })
    console.log('deploy')
  }

  const execUnDeployAction = () => {
    deployActionMutate(makeUndeployActionRequest(), {
      onSuccess: (data) => {
        console.log('un deploy 성공!', data)
        //dismissPopup()
      },
      onError: (error) => {
        console.error('undeploy 실패', error)
        //dismissPopup()
      }
    })
    console.log('undeploy')
  }

  const onOperationStatusOptionChaged = (value: string) => {
    active.setOperationStatusFilter(value)
  }

  const onDeployStatusOptionChaged = (value: string) => {
    active.setDeployStatusFilter(value)
  }

  const makeUndeployActionRequest = (): DeployActionRequest => {
    const [selectedGroupId, selectedSiteId] = selectedOrgs
    return {
      taskFlowId: taskFlowData?.id ?? -1,
      param: {
        action: 'UNDEPLOY',
        groupId: selectedGroupId,
        siteId: selectedSiteId,
        robotInfos: [...active.selectedRobotList],
        description: 'fixme'
      }
    }
  }

  const makeDeployActionRequest = (): DeployActionRequest => {
    const [selectedGroupId, selectedSiteId] = selectedOrgs
    return {
      taskFlowId: taskFlowData?.id ?? -1,
      param: {
        action: 'DEPLOY',
        groupId: selectedGroupId,
        siteId: selectedSiteId,
        robotInfos: [...active.selectedRobotList],
        description: 'fixme'
      }
    }
  }

  const dismissPopup = () => {
    setPopup(false)
    if (isDeployActionSuccess) {
      active.onSelectAllChanged(false)
      active.onSelectedRobotChanged([])
    }
    deployActionReset()
  }

  const toggleRobotSelection = (robot: RobotInfo) => {
    if (!robot.deployable?.deployable) return
    active.onSelectedRobotChanged(robot)
  }

  const handleSelectAll = () => {
    if (active.selectAll) {
      active.onSelectedRobotChanged([])
    } else {
      active.onSelectedRobotChanged(robotList.filter((item) => item.deployable?.deployable))
    }
    active.onSelectAllChanged(!active.selectAll)
  }

  const getDeployActionStatus = () => {
    if (isDeployActionPending) {
      return 'WORKING'
    }
    if (isDeployActionError) {
      return 'FAILURE'
    }
    if (isDeployActionSuccess) {
      return 'SUCCESS'
    }
    return 'READY'
  }

  return (
    <>
      {popup && (
        <DeployModal
          mode={deployMode}
          taskFlow={taskFlowData as TaskFlow}
          targetCount={active.selectedRobotList.length}
          status={getDeployActionStatus()}
          onClose={dismissPopup}
          onDeploy={deployMode === 'DEPLOY' ? execDeployAction : execUnDeployAction}
        ></DeployModal>
      )}

      <StyledPageContent className="column">
        <Title>{t('deploy.title')}</Title>
        <CenteredContent>
          <div
            style={{
              textAlign: 'start',
              border: '2px solid #ebedf0',
              borderRadius: '8px',
              backgroundColor: 'white',
              marginBottom: '24px',
              padding: '24px'
            }}
          >
            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1f2937'
              }}
            >
              {taskFlowData?.name} v{taskFlowData?.version}
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '14px',
                color: '#4b5563'
              }}
            >
              <p style={{ margin: 0 }}>- {taskFlowData?.description ?? t('deploy.descPlaceholder')}</p>
              <p
                style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                - {t('deploy.requiredSkills')}
                {[].length <= 0
                  ? t('deploy.skillsPlaceholder')
                  : [].map((item, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {skillRenderMap[item] || item}
                      </span>
                    ))}
              </p>
            </div>
          </div>

          <Tabs defaultActiveId="DEPLOY" onChange={onTabClick}>
            <Tab id="DEPLOY" label={t('deploy.deploy')}></Tab>
            <Tab id="DELETE_DEPLOY" label={t('deploy.undeploy')}></Tab>
          </Tabs>

          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={active.selectAll}
                onChange={handleSelectAll}
                style={{ height: '16px', width: '16px', cursor: 'pointer' }}
              />
              <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{t('deploy.selectAll')}</label>
            </div>

            <div style={{ display: 'flex', gap: '2px', marginLeft: '40px' }}>
              <Dropdown
                size="lg"
                minWidth="180px"
                defaultValue={'all'}
                value={active.operationStatusFilter}
                options={operationStatusOptions}
                onChange={onOperationStatusOptionChaged}
              />
              <Dropdown
                size="lg"
                minWidth="180px"
                defaultValue={'all'}
                value={active.deployStatusFilter}
                options={deployStatusOptions}
                onChange={onDeployStatusOptionChaged}
              />

              <SearchContainer>
                <Search
                  value={active.robotSearchQuery}
                  onChange={(e: any) => active.onRobotSearchQueryChanged(e.target.value)}
                  placeholder={t('deploy.searchRobot')}
                />
              </SearchContainer>
            </div>
          </div>
          <RobotList
            mode="DEPLOY"
            robotList={robotList}
            searchQuery={active.robotSearchQuery}
            selectedRobotIds={active.selectedRobotList}
            onChangeCheckbox={toggleRobotSelection}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              textAlign: 'start',
              border: '2px solid #ebedf0',
              borderRadius: '8px',
              backgroundColor: 'white'
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
              {t('deploy.selectedCount', { count: active.selectedRobotList.length })}
            </p>
            <button
              disabled={active.selectedRobotList.length === 0 || isDeployActionPending}
              style={{
                backgroundColor: active.selectedRobotList.length === 0 ? '#d1d5db' : '#7BA5C1',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: active.selectedRobotList.length === 0 ? 'not-allowed' : 'pointer'
              }}
              onClick={onClickDeploy}
            >
              {deployMode === 'DEPLOY' ? t('deploy.deploy') : t('deploy.undeploy')}
            </button>
          </div>
        </CenteredContent>
      </StyledPageContent>
    </>
  )
}

export default DeployPage
