import { useDevice } from '@/api/deviceApis'
import { StyledPageContent, Title, NoData, Checkbox, Button } from '@repo/ui'
import { useParams } from 'react-router-dom'
import TaskFlowList from './components/TaskFlowList'
import { useEffect, useMemo, useRef, useState, version } from 'react'
import { InstantAction, InstantActionsPayload } from '@/types/api/deviceControl'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { useInstantAction } from '@/api/deviceControlApis'
import { FlowArea, FlowCanvasWrap } from '../TaskFlowListDetailPage/styles'
import { useDeployTaskFlowAction, useGetTaskFlow, useListTaskFlows } from '@/api/taskFlowApis'
import TaskFlowReadonlyCanvas from '../TaskFlowCanvasPage/FlowCanvasViewer'
import { useTranslation } from 'react-i18next'
import { CenteredContent, Section } from './styles'
import { toast } from 'react-toastify'
import { RobotTaskFlow } from '@/types/api/device'
import { Battery, Activity } from 'lucide-react'
import DeployModal, { DeployTaskFlow } from '../DeployPage/components/DeployModal'
import { TaskFlow } from '@/types/taskflow'
import useDeploy from '../DeployPage/hooks/useDeploy'
import { useGetLatestDeployments } from '@/api/robotDeployApis'

const normalizeNullableValue = (value: unknown): string | null => {
  if (value == null) return null
  const next = String(value).trim()
  if (!next || next === 'none' || next === 'all') return null
  return next
}

const RobotDetailPage = () => {
  const { t } = useTranslation('tms')
  const { robotId } = useParams()
  const initialized = useRef(false)
  const [selectedId, setSelectedId] = useState(-1)
  const { data: robotData, error: robotDataError, isLoading: robotDataLoading } = useDevice(robotId, 1500)
  const { selectedOrgs } = useOrganizationStore()
  const { session } = useUserStore()
  const { mutate, isPending } = useInstantAction()
  const { data: taskFlowData } = useGetTaskFlow(selectedId)

  const [checkedItems, setCheckedItems] = useState<number[]>([])
  const [checkAll, setCheckAll] = useState(false)
  const [oneItemViewClicked, setOneItemViewClicked] = useState(false)
  const [popup, setPopup] = useState(false)

  const {
    execDeployAction,
    execUnDeployAction,
    getDeployActionStatus,
    deployActionReset,
    isDeployActionSuccess,
    isDeployActionPending,
    makeDeployState
  } = useDeploy()

  const group = robotData?.provision?.groupId
  const site = robotData?.provision?.siteId

  const { data: taskflowList } = useListTaskFlows(group ?? null, site ?? null)

  const deployInfoRequest = useMemo(() => {
    if (!taskFlowData) {
      return undefined
    }
    return {
      groupId: taskFlowData.groupId,
      siteId: taskFlowData.siteId,
      taskflowId: taskFlowData.id ?? -1
    }
  }, [taskFlowData])

  const { data: deployInfo } = useGetLatestDeployments(deployInfoRequest)
  console.log('deployInfo = ', deployInfo)

  const robotTaskFlows = useMemo(() => {
    let taskFlows = robotData?.tms?.taskFlowState?.taskFlows ?? []
    if (oneItemViewClicked) {
      taskFlows = taskFlows.filter((task) => task.id === selectedId)
    }

    return taskFlows.map((robotTask) => {
      const deployStatus = makeDeployState(robotData?.deviceId ?? '', deployInfo?.content ?? [])
      const orgTaskFlow = taskflowList?.find((task) => task.id === robotTask.id)

      return { ...robotTask, latestVersion: orgTaskFlow?.version }
    })
  }, [robotData?.tms?.taskFlowState?.taskFlows, taskflowList, oneItemViewClicked, deployInfo])

  console.log('robotTaskFlows', robotTaskFlows)

  useEffect(() => {
    if (initialized.current) return

    const taskFlows = robotData?.tms?.taskFlowState?.taskFlows ?? []
    if (taskFlows.length < 1) return

    const id = taskFlows.find((tf) => tf.operationStatus === 'RUNNING')?.id ?? taskFlows[0].id

    console.log('selected log', id)

    setSelectedId(id)
    initialized.current = true
  }, [robotData])

  if (robotDataError) return <div>loading</div>
  if (robotDataLoading) return <div>error</div>

  const onTaskFlowSelect = (id: number) => {
    setSelectedId(id)
  }
  const onTaskFlowChecked = (id: number) => {
    setCheckedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const onCheckAllClicked = (id: number) => {
    setCheckAll((prev) => {
      if (!prev) {
        setCheckedItems(robotTaskFlows.map((task) => task.id))
      } else {
        setCheckedItems([])
      }
      return !prev
    })
  }

  const onOneItemViewClicked = () => {
    setOneItemViewClicked(!oneItemViewClicked)
  }

  const onCommandClick = (command: string, taskFlowId: number) => {
    console.log('click button', command)
    const requestBody = createInstantActionsRequestBody(session?.userId, [
      createInstantAction(command, { tms_id: String(taskFlowId) }, 'HARD')
    ])

    console.log('request body', requestBody)

    mutate(
      {
        deviceId: robotId ?? '',
        body: requestBody
      },
      {
        onSuccess: (data) => {
          console.log('success', data)
          //dismissPopup()
          toast.info('제어를 요청했습니다.')
        },
        onError: (error) => {
          console.error('error', error)
          //dismissPopup()
          toast.warning('제어를 요청이 실패 되었습니다')
        }
      }
    )
    console.log('deploy')
  }
  const onDeployPopupClicked = () => {
    setPopup(true)
  }

  const dismissPopup = () => {
    setPopup(false)
    if (isDeployActionSuccess) {
      // active.onSelectAllChanged(false)
      // active.onSelectedRobotChanged([])
      setCheckedItems([])
    }
    deployActionReset()
  }

  const createInstantActionsRequestBody = (userId: string, actions: InstantAction[]): InstantActionsPayload => {
    return {
      userId: userId,
      actions: actions
    }
  }

  const createInstantAction = (
    actionType: string,
    params?: Record<string, string | number | boolean>,
    blockingType: InstantAction['blockingType'] = 'NONE'
  ): InstantAction => {
    return {
      actionType,
      actionId: crypto.randomUUID(),
      blockingType,
      actionParameters: params ? Object.entries(params).map(([key, value]) => ({ key, value })) : undefined
    }
  }

  const changedTasks = robotData?.tms?.taskFlowState?.runningTaskFlowStatus
  const activePath = robotData?.tms?.taskFlowState?.runningTaskFlowStatus?.activePath ?? []
  const finalValue = activePath

  console.log('changed task', changedTasks?.changedTasks)
  console.log('active task', finalValue)

  const resolvedGroupId =
    normalizeNullableValue(robotData?.provision?.groupId) ?? normalizeNullableValue(selectedOrgs?.[0])
  const resolvedSiteId =
    normalizeNullableValue(robotData?.provision?.siteId) ?? normalizeNullableValue(selectedOrgs?.[1])

  const taskFlowList = robotData?.tms?.taskFlowState?.taskFlows ?? []

  const charge = robotData?.state?.batteryState?.batteryCharge
  const batteryColor = (charge ?? 0) > 60 ? '#16a34a' : (charge ?? 0) > 20 ? '#d97706' : '#dc2626'
  const isStandby = robotData?.deviceState === 'STANDBY'
  const taskFlows = taskFlowList
    .filter((task) => checkedItems.includes(task.id))
    .map((task) => {
      return { name: task.name, id: task.id, version: task.version }
    })

  console.log('taskFlowData', taskFlowData)

  const title = taskFlowData?.name + ' ' + t('deploy.modal.undeployTitleSuffix')

  const mainDesc = () => {
    switch (getDeployActionStatus()) {
      case 'READY':
        return (
          t('deploy.modal.selectedPrefix') +
          t('deploy.taskFlowUnit', { count: +checkedItems.length }) +
          t('deploy.modal.undeployTasksSuffix')
        )

      case 'WORKING':
        return t('deploy.modal.undeploying')

      case 'SUCCESS':
        return t('deploy.modal.undeployRequested')

      case 'FAILURE':
        return t('deploy.modal.undeployFailed')
    }
  }

  const subDesc = () => {
    if (getDeployActionStatus() === 'READY') {
      return t('deploy.modal.irreversible')
    }
  }

  return (
    <>
      {popup && (
        <DeployModal
          title={title}
          desc={mainDesc()}
          subDesc={subDesc()}
          mode={'DELETE_DEPLOY'}
          status={getDeployActionStatus()}
          onClose={dismissPopup}
          onDeploy={async () => {
            if (!group || !site || !robotData?.deviceId || checkedItems.length === 0) return

            const results = await Promise.allSettled(
              taskFlows.map((task) => {
                const params = {
                  orgInfo: [group, site],
                  taskFlowId: task.id,
                  robotList: [{ groupId: group, siteId: site, id: robotData.deviceId }]
                }
                return execUnDeployAction(params)
              })
            )

            const failed = results
              .map((r, i) => ({ ...r, taskFlow: checkedItems[i] }))
              .filter((r) => r.status === 'rejected')

            if (failed.length > 0) {
              // failed 목록으로 "N개 실패" 안내 / 재시도 UI 등 처리
              console.error('배포 취소 실패:', failed)
            }
            // 성공/실패 개수에 따라 후처리
          }}
        ></DeployModal>
      )}
      <StyledPageContent className="column">
        <Title>{robotData?.deviceName}</Title>
        <div
          style={{
            textAlign: 'start',
            border: '2px solid #ebedf0',
            borderRadius: '8px',
            backgroundColor: 'white',
            marginBottom: '24px',
            padding: '24px',
            display: 'flex', // 추가
            flexDirection: 'column', // 추가
            gap: '8px' // 추가 — 줄 간격
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>상태 : </span>
            <Activity size={14} color={isStandby ? '#16a34a' : '#9ca3af'} />
            <span style={{ color: isStandby ? '#16a34a' : '#9ca3af' }}>{robotData?.deviceState}</span>
          </span>

          {charge != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>배터리 레벨 : </span>
              <Battery size={14} color={batteryColor} />
              <span style={{ color: batteryColor }}>{charge}%</span>
            </span>
          )}
          <div style={{ display: 'flex', gap: '2px' }}>
            <span>{t('robots.installedCount')}:</span>
            <span style={{ color: '#9ca3af' }}>{robotData?.tms?.taskFlowState?.taskFlows?.length ?? 0}</span>
          </div>
        </div>

        {taskFlowList.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Checkbox
                  type="checkbox"
                  checked={checkAll}
                  onChange={onCheckAllClicked}
                  style={{ height: '16px', width: '16px', cursor: 'pointer' }}
                />
                <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{t('deploy.selectAll')}</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                <Button onClick={onOneItemViewClicked}>{oneItemViewClicked ? '확대' : '축소'}</Button>
                <Button
                  onClick={() => {
                    onDeployPopupClicked()
                  }}
                  disabled={checkedItems.length < 1}
                >
                  삭제
                </Button>
              </div>
            </div>

            <CenteredContent>
              <TaskFlowList
                taskFlowList={robotTaskFlows as RobotTaskFlow[]}
                controlList={[
                  {
                    title: t('robotDetail.control.start'),
                    command: 'start',
                    onRequest: !isPending,
                    execute: onCommandClick
                  },
                  {
                    title: t('robotDetail.control.pause'),
                    command: 'pause',
                    onRequest: !isPending,
                    execute: onCommandClick
                  },
                  {
                    title: t('robotDetail.control.resume'),
                    command: 'resume',
                    onRequest: !isPending,
                    execute: onCommandClick
                  },
                  {
                    title: t('robotDetail.control.stop'),
                    command: 'stop',
                    onRequest: !isPending,
                    execute: onCommandClick
                  }
                ]}
                // settingList={[
                //   [
                //     {
                //       title: t('robotDetail.control.use'),
                //       command: 'enable',
                //       onRequest: !isPending,
                //       execute: onCommandClick
                //     },
                //     {
                //       title: t('robotDetail.control.unuse'),
                //       command: 'disable',
                //       onRequest: !isPending,
                //       execute: onCommandClick
                //     }
                //   ]
                // ]}
                selectedId={selectedId}
                onListClick={onTaskFlowSelect}
                onItemChecked={onTaskFlowChecked}
                checkedItems={checkedItems}
              />
            </CenteredContent>
            <CenteredContent>
              <Section>
                <FlowArea>
                  <FlowCanvasWrap>
                    <TaskFlowReadonlyCanvas
                      flowDefinition={taskFlowData?.flowDefinition}
                      activeNodeList={activePath}
                      displayOption="RUNNING_STATUS"
                      flowName={taskFlowData?.name}
                    />
                  </FlowCanvasWrap>
                </FlowArea>
              </Section>
            </CenteredContent>
          </>
        )}
      </StyledPageContent>
    </>
  )
}

export default RobotDetailPage
