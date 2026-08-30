import { RobotInfo, TaskFlowRunningStatus } from '@/types/RobotInfo'
import { OrganizationSelector } from '@repo/ui'
import { SearchContainer } from '@repo/ui'
import { Section } from '@repo/ui'
import { Search } from '@repo/ui'
import { Dropdown } from '@repo/ui'
import { Title } from '@repo/ui'
import { StyledPageContent } from '@repo/ui'
import RobotList from '@/pages/components/robot/RobotList'
import { makeBuildingInfo, toRobotInfo } from '@/pages/components/robot/toRobotInfo'
import { useEffect, useMemo, useState } from 'react'
import { useDeviceList } from '@/api/deviceApis'
import { useOrgFilter } from '@/pages/hooks/useOrgFilter'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SimpleRobotInfo } from '@/types/taskflow'
import { useDeployTaskFlowAction } from '@/api/taskFlowApis'
import { useInstantAction } from '@/api/deviceControlApis'
import { useOrganizationStore, useUserStore } from '@repo/stores'
import { AI_TASKFLOW_CANVAS_COMMAND_EVENT, AI_TASKFLOW_CANVAS_RESULT_EVENT } from '@repo/constants'
import { RULE_KEY } from '@repo/constants'
import { buildAiTaskflowReplyText } from '@/utils/aiTaskflowCommand'
import { toast } from 'react-toastify'
import { useSite } from '@/api/siteApi'

const taskFlowOptions = [{ value: 'all', name: 'all' }]

const taskFlowStatusOptions = [
  { value: 'all', name: 'all' },
  { value: 'READY', name: 'ready' },
  { value: 'RUNNING', name: 'running' },
  { value: 'PAUSED', name: 'paused' },
  { value: 'CANCELED', name: 'canceled' },
  { value: 'STOPPED', name: 'stopped' },
  { value: 'FAILURE', name: 'failure' },
  { value: 'SUCCESS', name: 'success' }
]

const RobotsPage = () => {
  const { t } = useTranslation('tms')
  const navigate = useNavigate()
  const { selectedOrgs } = useOrganizationStore()
  const { session } = useUserStore()
  const { mutateAsync: deployTaskFlowActionAsync } = useDeployTaskFlowAction()
  const { mutateAsync: sendInstantActionAsync } = useInstantAction()
  const [selectedRobotIds, setSelectedRobotId] = useState<SimpleRobotInfo[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [firstFilter, setFirstFlilter] = useState('all')
  const [secondFilter, setSecondFlilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { onOrgChanged, deviceParams, matchesOrgFilter } = useOrgFilter()
  const { data: devicesData, error: devicesError, isLoading: devicesLoading } = useDeviceList(deviceParams)
  const { data: siteInfo } = useSite(selectedOrgs[1])

  const buildingInfo = useMemo(() => makeBuildingInfo(siteInfo?.buildings), [siteInfo])

  const robotList: RobotInfo[] = useMemo(() => {
    const targetRobots = devicesData?.content ?? []
    const robots = targetRobots.map((device) => {
      const taskFlowState = device.tms?.taskFlowState
      const runningTaskFlowId = taskFlowState?.runningTaskFlowStatus?.taskFlowId
      const runningTaskFlow = taskFlowState?.taskFlows?.find((tf) => tf.id === runningTaskFlowId)

      taskFlowState?.taskFlows?.forEach((tf) => {
        if (!taskFlowOptions.some((tfo) => tfo.name === tf.name)) {
          taskFlowOptions.push({ name: tf.name, value: tf.name })
        }
      })

      return {
        ...toRobotInfo(device, buildingInfo),
        installedTaskFlowCount: taskFlowState?.taskFlows?.length ?? 0,
        runningTaskFlowId,
        runningTaskFlowName: runningTaskFlow?.name,
        runningTaskFlowStatus: runningTaskFlow?.operationStatus as TaskFlowRunningStatus
      }
    })

    const filtered = robots.filter((robot) => {
      // 'none'(미지정) 선택은 서버 파라미터로 표현할 수 없어 여기서 걸러진다.
      if (!matchesOrgFilter(robot)) {
        return false
      }
      if (firstFilter !== 'all' && robot.runningTaskFlowName !== firstFilter) {
        return false
      }
      if (secondFilter !== 'all' && robot.runningTaskFlowStatus !== secondFilter) {
        return false
      }
      return true
    })

    return filtered.sort((a, b) => {
      const groupA = a.group ?? ''
      const groupB = b.group ?? ''
      const groupCompare = groupA.localeCompare(groupB, 'ko')

      if (groupCompare !== 0) return groupCompare

      const siteA = a.site ?? ''
      const siteB = b.site ?? ''
      const siteCompare = siteA.localeCompare(siteB, 'ko')

      if (siteCompare !== 0) return siteCompare

      return (a.name ?? '').localeCompare(b.name ?? '', 'ko')
    })
  }, [devicesData, firstFilter, secondFilter, matchesOrgFilter, buildingInfo])

  const onSearchQueryChaged = (e: any) => {
    setSearchQuery(e.target.value)
  }

  const resetSearchQuery = () => {
    setSearchQuery('')
  }

  const onTaskFlowStatusChaged = (value: string) => {
    setSecondFlilter(value)
  }

  useEffect(() => {
    const onTaskflowCanvasCommand = async (event: Event) => {
      const custom = event as CustomEvent<any>
      const command = custom?.detail?.command
      if (!command || typeof command !== 'object') return

      const type = String(command?.type ?? '')
        .trim()
        .toLowerCase()
      console.info('[AI_TASKFLOW][RAW_EVENT_RECEIVED]', {
        page: 'RobotsPage',
        type,
        command
      })
      if (
        ![
          RULE_KEY.TASKFLOW_DEPLOY,
          RULE_KEY.TASKFLOW_RUN,
          RULE_KEY.TASKFLOW_PAUSE,
          RULE_KEY.TASKFLOW_RESUME,
          RULE_KEY.TASKFLOW_STOP,
          'deploy-taskflow',
          'run-taskflow',
          'pause-taskflow',
          'resume-taskflow',
          'stop-taskflow'
        ].includes(type)
      ) {
        console.warn('[AI_TASKFLOW][UNSUPPORTED_COMMAND_TYPE]', {
          page: 'RobotsPage',
          type
        })
        return
      }

      const candidateList = (value: unknown) => {
        if (Array.isArray(value)) {
          return value.map((item) => String(item ?? '').trim()).filter(Boolean)
        }
        const single = String(value ?? '').trim()
        return single ? [single] : []
      }

      const robotCandidates = candidateList(command?.robotId ?? command?.robot)
      const taskFlowCandidates = candidateList(command?.taskFlowId ?? command?.taskflowId ?? command?.id)
      const explicitRobotId = robotCandidates.find((candidate) => !/^\d+$/.test(candidate)) || ''
      const explicitTaskFlowId = taskFlowCandidates.find((candidate) => /^\d+$/.test(candidate)) || ''
      const robotId = explicitRobotId || ''
      const taskFlowId = Number(explicitTaskFlowId)

      const resolvedGroupId = String(selectedOrgs?.[0] ?? '').trim() || null
      const resolvedSiteId = String(selectedOrgs?.[1] ?? '').trim() || null

      console.info('[AI_TASKFLOW][COMMAND_RECEIVED]', {
        page: 'RobotsPage',
        type,
        robotId,
        taskFlowId,
        resolvedGroupId,
        resolvedSiteId,
        command
      })

      const dispatchResult = (success: boolean, message?: string) => {
        if (success) {
          // AI chat commands should only show the chat reply; manual button clicks keep the original toast UX.
        } else {
          toast.warning(String(message ?? '').trim() || custom?.detail?.replyText || '명령을 처리하지 못했습니다.')
        }

        window.dispatchEvent(
          new CustomEvent(AI_TASKFLOW_CANVAS_RESULT_EVENT, {
            detail: {
              kind: 'command',
              commandType: type,
              success,
              didApply: success,
              message: String(message ?? '').trim() || custom?.detail?.replyText || '',
              assistantMessageId: String(custom?.detail?.assistantMessageId ?? '').trim() || undefined,
              historyContext: custom?.detail?.historyContext
            }
          })
        )
      }

      if (
        !robotId ||
        !Number.isFinite(taskFlowId) ||
        taskFlowId <= 0 ||
        (!resolvedGroupId && (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow')) ||
        (!resolvedSiteId && (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow'))
      ) {
        console.warn('[AI_TASKFLOW][COMMAND_BLOCKED_BY_GUARD]', {
          page: 'RobotsPage',
          type,
          robotId,
          taskFlowId,
          resolvedGroupId,
          resolvedSiteId,
          requiresDeployOrg: type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow'
        })
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 대상 정보를 찾지 못했습니다.'))
        return
      }

      try {
        if (type === RULE_KEY.TASKFLOW_DEPLOY || type === 'deploy-taskflow') {
          const deployPayload = {
            taskFlowId,
            param: {
              action: 'DEPLOY',
              groupId: resolvedGroupId,
              siteId: resolvedSiteId,
              robotInfos: [{ groupId: resolvedGroupId, siteId: resolvedSiteId, id: robotId }],
              description: String(command?.description ?? 'AI command deploy taskflow')
            }
          }

          console.info('[AI_TASKFLOW][DEPLOY_API_CALL]', {
            type,
            robotId,
            taskFlowId,
            groupId: resolvedGroupId,
            siteId: resolvedSiteId,
            payload: deployPayload
          })

          const deployResult = await deployTaskFlowActionAsync(deployPayload)
          console.info('[AI_TASKFLOW][DEPLOY_API_RESULT]', { type, robotId, taskFlowId, result: deployResult })
          const finalDeployReply = buildAiTaskflowReplyText(
            custom?.detail?.replyText || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`,
            robotId,
            taskFlowId
          )
          dispatchResult(
            true,
            finalDeployReply || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`
          )
          return
        }

        const userId = String(session?.userId ?? '')
        if (!userId) {
          dispatchResult(false, '실행/제어를 요청하려면 로그인된 사용자 정보가 필요합니다.')
          return
        }

        const instantActionTypeMap: Record<string, string> = {
          [RULE_KEY.TASKFLOW_RUN]: 'start',
          [RULE_KEY.TASKFLOW_PAUSE]: 'startPause',
          [RULE_KEY.TASKFLOW_RESUME]: 'stopPause',
          [RULE_KEY.TASKFLOW_STOP]: 'stop',
          'run-taskflow': 'start',
          'pause-taskflow': 'startPause',
          'resume-taskflow': 'stopPause',
          'stop-taskflow': 'stop'
        }

        const instantPayload = {
          deviceId: robotId,
          body: {
            userId,
            actions: [
              {
                actionType: instantActionTypeMap[type] ?? 'start',
                actionId: crypto.randomUUID(),
                blockingType: 'HARD',
                actionParameters: [{ key: 'tms_id', value: String(taskFlowId) }]
              }
            ]
          }
        }

        console.info('[AI_TASKFLOW][INSTANT_ACTION_CALL]', {
          type,
          robotId,
          taskFlowId,
          actionType: instantPayload.body.actions[0].actionType,
          payload: instantPayload
        })

        const instantResult = await sendInstantActionAsync(instantPayload)
        console.info('[AI_TASKFLOW][INSTANT_ACTION_RESULT]', { type, robotId, taskFlowId, result: instantResult })

        const defaultReplyMap: Record<string, string> = {
          [RULE_KEY.TASKFLOW_RUN]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 실행을 요청했습니다.`,
          [RULE_KEY.TASKFLOW_PAUSE]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 일시정지를 요청했습니다.`,
          [RULE_KEY.TASKFLOW_RESUME]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 재개를 요청했습니다.`,
          [RULE_KEY.TASKFLOW_STOP]: `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 정지를 요청했습니다.`,
          'run-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 실행을 요청했습니다.`,
          'pause-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 일시정지를 요청했습니다.`,
          'resume-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 재개를 요청했습니다.`,
          'stop-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 정지를 요청했습니다.`
        }

        const finalReplyText = buildAiTaskflowReplyText(
          custom?.detail?.replyText ||
            defaultReplyMap[type] ||
            `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 제어를 요청했습니다.`,
          robotId,
          taskFlowId
        )
        dispatchResult(true, finalReplyText || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 제어를 요청했습니다.`)
      } catch (error) {
        console.error('[AI_TASKFLOW][COMMAND_RUN_FAILED]', error)
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 요청에 실패했습니다.'))
      }
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    return () => window.removeEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
  }, [deployTaskFlowActionAsync, sendInstantActionAsync, selectedOrgs, session?.userId])

  if (devicesLoading) return <p>Loading...</p>
  if (devicesError) return <p>error: {devicesError.message}</p>

  return (
    <>
      <StyledPageContent className="column">
        <Title>{t('robots.title')}</Title>
        <OrganizationSelector onChange={onOrgChanged} supportAlls={[true, true]} supportNone={[true, true]} />
        <Section>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              margin: '0 0 12px 0',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                <Dropdown
                  size="lg"
                  minWidth="180px"
                  placeholder="TaskFlow 상태"
                  defaultValue={t('robots.taskflowFilter')}
                  options={taskFlowStatusOptions}
                  onChange={onTaskFlowStatusChaged}
                />

                <SearchContainer>
                  <Search
                    value={searchQuery}
                    onChange={onSearchQueryChaged}
                    onReset={resetSearchQuery}
                    placeholder={t('deploy.searchRobot')}
                  />
                </SearchContainer>
              </div>
            </div>
          </div>

          <RobotList
            mode="CONTROL"
            robotList={robotList}
            searchQuery={searchQuery}
            selectedRobotIds={selectedRobotIds}
            onClickItem={(robot) => navigate(`/tms/robots/${robot.id}/detail`)}
          />
        </Section>
      </StyledPageContent>
    </>
  )
}

export default RobotsPage
