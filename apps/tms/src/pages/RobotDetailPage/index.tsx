import { useDevice } from '@/api/deviceApis'
import { StyledPageContent, Title, Section, NoData } from '@repo/ui'
import { useParams } from 'react-router-dom'
import TaskFlowList from './components/TaskFlowList'
import { useEffect, useRef, useState } from 'react'
import { InstantAction, InstantActionsPayload, InstantActionsRequestBody } from '@/types/api/deviceControl'
import { useUserStore } from '@repo/stores'
import { useInstantAction } from '@/api/deviceControlApis'
import { FlowArea, FlowCanvasWrap } from '../TaskFlowListDetailPage/styles'
import { useGetTaskFlow } from '@/api/taskFlowApis'
import TaskFlowReadonlyCanvas from '../TaskFlowCanvasPage/FlowCanvasViewer'
import { useTranslation } from 'react-i18next'
import { CenteredContent } from './styles'

const RobotDetailPage = () => {
  const { t } = useTranslation('tms')
  const headerSeq = useRef(3000)
  const { robotId } = useParams()
  const initialized = useRef(false)
  const [selectedId, setSelectedId] = useState(-1)
  const { data: robotData, error: robotDataError, isLoading: robotDataLoading } = useDevice(robotId)
  const { session } = useUserStore()
  const { mutate } = useInstantAction()
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
      createInstantAction(command, { task_flow_id: taskFlowId }, 'HARD')
    ])

    console.log('request body', requestBody)

    mutate(
      {
        deviceId: robotId ?? '',
        body: requestBody
      },
      {
        onSuccess: (data) => {
          console.log('deploy 성공!', data)
          //dismissPopup()
        },
        onError: (error) => {
          console.error('deploy 실패', error)
          //dismissPopup()
        }
      }
    )
    console.log('deploy')
  }

  const createInstantActionsRequestBody = (userId: string, actions: InstantAction[]): InstantActionsRequestBody => {
    const payload: InstantActionsPayload = {
      headerId: ++headerSeq.current,
      timestamp: new Date().toISOString(),
      instantActions: actions
    }
    return { userId, payload }
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

  const activePath = robotData?.tms?.taskFlowState?.runningTaskFlowStatus?.activePath ?? [
    {
      nodeId: 'start',
      name: 'root',
      nodeType: 'CONTROL',
      udpateTime: Date().toString(),
      status: 'RUNNING',
      runningCount: 128
    },
    {
      nodeId: '1781339328751',
      name: 'MoveTo',
      nodeType: 'CONTROL',
      udpateTime: Date().toString(),
      status: 'FAILURE',
      runningCount: 128
    },
    {
      nodeId: '1781339358450',
      name: 'PlaySound',
      nodeType: 'CONTROL',
      udpateTime: Date().toString(),
      status: 'RUNNING',
      runningCount: 128
    }
  ]

  console.log('taskFlowData', taskFlowData)

  return (
    <>
      <StyledPageContent className="column">
        <Title>{robotData?.deviceName}</Title>
        {false ? (
          <NoData>{t('list.noData')}</NoData>
        ) : (
          <>
            <CenteredContent>
              <TaskFlowList
                taskFlowList={
                  robotData?.tms?.taskFlowState?.taskFlows ?? [
                    { name: '2', id: 1, version: 1, isActive: true, isEnabled: true, operationStatus: 'RUNNING' },
                    { name: '3', id: 2, version: 1, isActive: false, isEnabled: true, operationStatus: 'READY' }
                  ]
                }
                controlList={[
                  { title: t('robotDetail.control.start'), command: 'start', execute: onCommandClick },
                  { title: t('robotDetail.control.pause'), command: 'pause', execute: onCommandClick },
                  { title: t('robotDetail.control.resume'), command: 'resume', execute: onCommandClick },
                  { title: t('robotDetail.control.stop'), command: 'stop', execute: onCommandClick }
                ]}
                settingList={[
                  [
                    { title: t('robotDetail.control.use'), command: 'enable', execute: onCommandClick },
                    { title: t('robotDetail.control.unuse'), command: 'disable', execute: onCommandClick }
                  ]
                ]}
                selectedId={selectedId}
                onListClick={onTaskFlowSelect}
              />
            </CenteredContent>

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
          </>
        )}
      </StyledPageContent>
    </>
  )
}

export default RobotDetailPage
