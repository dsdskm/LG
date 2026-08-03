import { useDevice } from '@/api/deviceApis'
import { StyledPageContent, Title, NoData } from '@repo/ui'
import { useParams } from 'react-router-dom'
import TaskFlowList from './components/TaskFlowList'
import { useEffect, useRef, useState } from 'react'
import { InstantAction, InstantActionsPayload } from '@/types/api/deviceControl'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { useInstantAction } from '@/api/deviceControlApis'
import { FlowArea, FlowCanvasWrap } from '../TaskFlowListDetailPage/styles'
import { useGetTaskFlow } from '@/api/taskFlowApis'
import TaskFlowReadonlyCanvas from '../TaskFlowCanvasPage/FlowCanvasViewer'
import { useTranslation } from 'react-i18next'
import { CenteredContent, Section } from './styles'
import { toast } from 'react-toastify'

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
  const { data: robotData, error: robotDataError, isLoading: robotDataLoading } = useDevice(robotId, 3000)
  const { selectedOrgs } = useOrganizationStore()
  const { session } = useUserStore()
  const { mutate, isPending } = useInstantAction()
  const { data: taskFlowData } = useGetTaskFlow(selectedId)

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

  const activePath = robotData?.tms?.taskFlowState?.runningTaskFlowStatus?.activePath
  // ?? [
  //   {
  //     nodeId: 'start',
  //     name: 'root',
  //     nodeType: 'CONTROL',
  //     udpateTime: Date().toString(),
  //     status: 'RUNNING',
  //     runningCount: 128
  //   },
  //   {
  //     nodeId: '1781339328751',
  //     name: 'MoveTo',
  //     nodeType: 'CONTROL',
  //     udpateTime: Date().toString(),
  //     status: 'FAILURE',
  //     runningCount: 128
  //   },
  //   {
  //     nodeId: '1781339358450',
  //     name: 'PlaySound',
  //     nodeType: 'CONTROL',
  //     udpateTime: Date().toString(),
  //     status: 'RUNNING',
  //     runningCount: 128
  //   }
  // ]

  const resolvedGroupId =
    normalizeNullableValue(robotData?.provision?.groupId) ?? normalizeNullableValue(selectedOrgs?.[0])
  const resolvedSiteId =
    normalizeNullableValue(robotData?.provision?.siteId) ?? normalizeNullableValue(selectedOrgs?.[1])

  const taskFlowList = robotData?.tms?.taskFlowState?.taskFlows ?? []
  // ?? [
  //   { name: '2', id: 1, version: 1, isActive: true, isEnabled: true, operationStatus: 'RUNNING' },
  //   { name: '3', id: 2, version: 1, isActive: false, isEnabled: true, operationStatus: 'READY' }
  // ]

  console.log('taskFlowData', taskFlowData)

  return (
    <>
      <StyledPageContent className="column">
        <Title>{robotData?.deviceName}</Title>
        {false ? (
          <NoData>{t('list.noData')}</NoData>
        ) : (
          <>
            {/* <RobotControlTopPanel
              groupId={resolvedGroupId}
              siteId={resolvedSiteId}
              deviceId={normalizeNullableValue(robotId) ?? ''}
            /> */}

            <CenteredContent>
              <TaskFlowList
                taskFlowList={taskFlowList}
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
                settingList={[
                  [
                    {
                      title: t('robotDetail.control.use'),
                      command: 'enable',
                      onRequest: !isPending,
                      execute: onCommandClick
                    },
                    {
                      title: t('robotDetail.control.unuse'),
                      command: 'disable',
                      onRequest: !isPending,
                      execute: onCommandClick
                    }
                  ]
                ]}
                selectedId={selectedId}
                onListClick={onTaskFlowSelect}
              />
            </CenteredContent>

            <CenteredContent>
              <Section>
                {taskFlowList.length <= 0 ? (
                  <NoData>{t('list.noData')}</NoData>
                ) : (
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
                )}
              </Section>
            </CenteredContent>
          </>
        )}
      </StyledPageContent>
    </>
  )
}

export default RobotDetailPage
