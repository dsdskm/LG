import { useDevice } from '@/api/deviceApis'
import { StyledPageContent, Title, NoData } from '@repo/ui'
import { useParams } from 'react-router-dom'
import TaskFlowList from './components/TaskFlowList'
import { useEffect, useRef, useState } from 'react'
import { InstantAction, InstantActionsPayload } from '@/types/api/deviceControl'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { useInstantAction } from '@/api/deviceControlApis'
import { FlowArea, FlowCanvasWrap } from '../TaskFlowListDetailPage/styles'
import { useDeployTaskFlowAction, useGetTaskFlow } from '@/api/taskFlowApis'
import type { DeployActionRequest } from '@/types/taskflow'
import TaskFlowReadonlyCanvas from '../TaskFlowCanvasPage/FlowCanvasViewer'
import { useTranslation } from 'react-i18next'
import { CenteredContent, Section } from './styles'
import { toast } from 'react-toastify'
import {
  AI_TASKFLOW_CANVAS_COMMAND_EVENT,
  AI_TASKFLOW_CANVAS_RESULT_EVENT
} from '@repo/ui/components/layout/AiAssistantPanel/taskflowEvents.js'

const normalizeNullableValue = (value: unknown): string | null => {
  if (value == null) return null
  const next = String(value).trim()
  if (!next || next === 'none' || next === 'all') return null
  return next
}

const normalizeCommandCandidates = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean)
  }

  const single = String(value ?? '').trim()
  return single ? [single] : []
}

const resolveAiCommandTarget = (command: Record<string, unknown>, routeRobotId: string, fallbackTaskFlowId?: number) => {
  const robotCandidates = normalizeCommandCandidates(command?.robotId ?? command?.robot)
  const taskFlowCandidates = normalizeCommandCandidates(command?.taskFlowId ?? command?.taskflowId ?? command?.id)

  const explicitRobotId = robotCandidates.find((candidate) => !/^\d+$/.test(candidate)) || ''
  const explicitTaskFlowId = taskFlowCandidates.find((candidate) => /^\d+$/.test(candidate)) || ''

  return {
    resolvedRobotId: explicitRobotId || routeRobotId || '',
    taskFlowIdValue: Number(explicitTaskFlowId || (Number.isFinite(fallbackTaskFlowId ?? NaN) ? String(fallbackTaskFlowId) : ''))
  }
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
  const { mutateAsync: deployTaskFlowActionAsync } = useDeployTaskFlowAction()
  const { data: taskFlowData } = useGetTaskFlow(selectedId)

  useEffect(() => {
    if (initialized.current) return

    const taskFlows = robotData?.tms?.taskFlowState?.taskFlows ?? []
    if (taskFlows.length < 1) return

    const id = taskFlows.find((tf) => tf.operationStatus === 'RUNNING')?.id ?? taskFlows[0].id

    setSelectedId(id)
    initialized.current = true
  }, [robotData])

  const onTaskFlowSelect = (id: number) => {
    setSelectedId(id)
  }

  const onCommandClick = (command: string, taskFlowId: number) => {
    const requestBody = createInstantActionsRequestBody(session?.userId, [
      createInstantAction(command, { tms_id: String(taskFlowId) }, 'HARD')
    ])

    mutate(
      {
        deviceId: robotId ?? '',
        body: requestBody
      },
      {
        onSuccess: () => {
          toast.info('제어를 요청했습니다.')
        },
        onError: () => {
          toast.warning('제어를 요청이 실패 되었습니다')
        }
      }
    )
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

  useEffect(() => {
    const onTaskflowCanvasCommand = async (event: Event) => {
      const custom = event as CustomEvent<any>
      const command = custom?.detail?.command
      if (!command || typeof command !== 'object') return

      const type = String(command?.type ?? '').trim().toLowerCase()
      if (!['deploy-taskflow', 'run-taskflow', 'pause-taskflow', 'resume-taskflow', 'stop-taskflow'].includes(type)) {
        return
      }

      const routeRobotId = String(robotId ?? '').trim()
      const fallbackTaskFlowId = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : NaN
      const { resolvedRobotId, taskFlowIdValue } = resolveAiCommandTarget(command, routeRobotId, fallbackTaskFlowId)

      const resolvedGroupId = normalizeNullableValue(robotData?.provision?.groupId) ?? normalizeNullableValue(selectedOrgs?.[0])
      const resolvedSiteId = normalizeNullableValue(robotData?.provision?.siteId) ?? normalizeNullableValue(selectedOrgs?.[1])

      const dispatchResult = (success: boolean, message?: string) => {
        const finalMessage = String(message ?? '').trim() || custom?.detail?.replyText || ''
        if (success) {
          // AI chat commands should only show the chat reply; manual button clicks keep the original toast UX.
        } else {
          toast.warning(finalMessage || '명령을 처리하지 못했습니다.')
        }

        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
            detail: {
              kind: 'command',
              commandType: type,
              success,
              didApply: success,
              message: finalMessage,
              assistantMessageId: String(custom?.detail?.assistantMessageId ?? '').trim() || undefined,
              historyContext: custom?.detail?.historyContext
            }
          })
        )
      }

      if (!resolvedRobotId || !Number.isFinite(taskFlowIdValue) || taskFlowIdValue <= 0 || (!resolvedGroupId && type === 'deploy-taskflow') || (!resolvedSiteId && type === 'deploy-taskflow')) {
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 대상 정보를 찾지 못했습니다.'))
        return
      }

      try {
        if (type === 'deploy-taskflow') {
          const deployPayload: DeployActionRequest = {
            taskFlowId: taskFlowIdValue,
            param: {
              action: 'DEPLOY',
              groupId: resolvedGroupId,
              siteId: resolvedSiteId,
              robotInfos: [{ groupId: String(resolvedGroupId ?? ''), siteId: String(resolvedSiteId ?? ''), id: resolvedRobotId }],
              description: String(command?.description ?? 'AI command deploy taskflow')
            }
          }

          console.info('[AI_TASKFLOW][DEPLOY_API_CALL]', { type, robotId: resolvedRobotId, taskFlowId: taskFlowIdValue, groupId: resolvedGroupId, siteId: resolvedSiteId, payload: deployPayload })
          const deployResult = await deployTaskFlowActionAsync(deployPayload)
          console.info('[AI_TASKFLOW][DEPLOY_API_RESULT]', { type, robotId: resolvedRobotId, taskFlowId: taskFlowIdValue, result: deployResult })
          dispatchResult(true, String(custom?.detail?.replyText || `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 배포를 요청했습니다.`))
          return
        }

        const userId = String(session?.userId ?? '')
        if (!userId) {
          dispatchResult(false, '실행/제어를 요청하려면 로그인된 사용자 정보가 필요합니다.')
          return
        }

        const instantActionTypeMap: Record<string, string> = {
          'run-taskflow': 'start',
          'pause-taskflow': 'startPause',
          'resume-taskflow': 'stopPause',
          'stop-taskflow': 'stop'
        }

        const instantPayload: InstantActionsPayload = {
          userId,
          actions: [{
            actionType: instantActionTypeMap[type] ?? 'start',
            actionId: crypto.randomUUID(),
            blockingType: 'HARD',
            actionParameters: [{ key: 'tms_id', value: String(taskFlowIdValue) }]
          }]
        }

        const instantRequest = {
          deviceId: resolvedRobotId,
          body: instantPayload
        }

        console.info('[AI_TASKFLOW][INSTANT_ACTION_CALL]', { type, robotId: resolvedRobotId, taskFlowId: taskFlowIdValue, actionType: instantPayload.actions[0].actionType, payload: instantRequest })
        const instantResult = await mutate(instantRequest, { onSuccess: () => undefined, onError: () => undefined })
        console.info('[AI_TASKFLOW][INSTANT_ACTION_RESULT]', { type, robotId: resolvedRobotId, taskFlowId: taskFlowIdValue, result: instantResult })

        const defaultReplyMap: Record<string, string> = {
          'run-taskflow': `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 실행을 요청했습니다.`,
          'pause-taskflow': `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 일시정지를 요청했습니다.`,
          'resume-taskflow': `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 재개를 요청했습니다.`,
          'stop-taskflow': `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 정지를 요청했습니다.`
        }

        dispatchResult(true, String(custom?.detail?.replyText || defaultReplyMap[type] || `${resolvedRobotId} 로봇에서 ${taskFlowIdValue} 태스크플로우 제어를 요청했습니다.`))
      } catch (error) {
        console.error('[AI_TASKFLOW][COMMAND_RUN_FAILED]', error)
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 요청에 실패했습니다.'))
      }
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    return () => window.removeEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
  }, [deployTaskFlowActionAsync, mutate, robotId, selectedId, selectedOrgs, session?.userId])

  const activePath = robotData?.tms?.taskFlowState?.runningTaskFlowStatus?.activePath

  const resolvedGroupId =
    normalizeNullableValue(robotData?.provision?.groupId) ?? normalizeNullableValue(selectedOrgs?.[0])
  const resolvedSiteId =
    normalizeNullableValue(robotData?.provision?.siteId) ?? normalizeNullableValue(selectedOrgs?.[1])

  const taskFlowList = robotData?.tms?.taskFlowState?.taskFlows ?? []
  // ?? [
  //   { name: '2', id: 1, version: 1, isActive: true, isEnabled: true, operationStatus: 'RUNNING' },
  //   { name: '3', id: 2, version: 1, isActive: false, isEnabled: true, operationStatus: 'READY' }
  // ]

  if (robotDataError) return <div>loading</div>
  if (robotDataLoading) return <div>error</div>

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
