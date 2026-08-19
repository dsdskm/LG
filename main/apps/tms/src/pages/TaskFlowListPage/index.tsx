import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTaskFlowStore } from '@/store/taskflow.store'
import TaskFlowListRow from './TaskFlowListRow'
import {
  StyledPageContent,
  Section,
  Title,
  NoData,
  Search,
  SearchContainer,
  HeaderTitleGroup,
  Button,
  Dropdown,
  OrganizationSelector
} from '@repo/ui'
import { ButtonWrap, ListControls } from './styles'
import { useOrganizationStore, useResponsiveStore, useUserStore } from '@repo/stores'
import { TOTAL_GROUP_ID, TOTAL_SITE_ID } from '@/common/constants'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'
import { useDeployTaskFlowAction } from '@/api/taskFlowApis'
import { useInstantAction } from '@/api/deviceControlApis'
import type { DeployActionRequest } from '@/types/taskflow'
import type { InstantActionsRequest } from '@/types/api/deviceControl'
import {
  AI_TASKFLOW_CANVAS_COMMAND_EVENT,
  AI_TASKFLOW_CANVAS_RESULT_EVENT
} from '@repo/ui/components/layout/AiAssistantPanel/taskflowEvents.js'
import { toast } from 'react-toastify'

type TaskFlowSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'createdAt-asc'
  | 'createdAt-desc'
  | 'updatedAt-asc'
  | 'updatedAt-desc'

export default function TaskFlowListPage() {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const flows = useTaskFlowStore((state) => state.flows)
  const refreshFlows = useTaskFlowStore((state) => state.refreshFlows)
  const copyFlow = useTaskFlowStore((state) => state.copyFlow)
  const { allOrgs, selectedOrgs } = useOrganizationStore()
  const { session } = useUserStore()
  const { mutateAsync: deployTaskFlowActionAsync } = useDeployTaskFlowAction()
  const { mutateAsync: sendInstantActionAsync } = useInstantAction()

  const [copyResultMessage, setCopyResultMessage] = useState('')
  const [copyErrorMessage, setCopyErrorMessage] = useState('')

  // 선택 모드: 여러 Task Flow 를 골라 한 번에 복제한다.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkCopying, setBulkCopying] = useState(false)

  // 그룹=전체(all)인데 특정 사이트가 선택된 경우, 사이트의 상위 그룹 코드를 찾아 함께 전달한다.
  const handleOrgChange = ({ values }: any) => {
    let groupId = values?.[0] ?? null
    const siteId = values?.[1] ?? null

    const isGroupAll = groupId == null || groupId === TOTAL_GROUP_ID
    const isSiteSelected = siteId != null && siteId !== TOTAL_SITE_ID && siteId !== 'none'

    if (isGroupAll && isSiteSelected) {
      const site = allOrgs.find((org: any) => String(org.code) === String(siteId))
      if (site?.parentCode != null) {
        groupId = site.parentCode
      }
    }

    setSelectedIds([])
    refreshFlows(groupId, siteId)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<TaskFlowSortOption>('updatedAt-desc')
  const sortOptions = [
    { value: 'name-asc', name: t('list.sort.nameAsc') },
    { value: 'name-desc', name: t('list.sort.nameDesc') },
    { value: 'createdAt-asc', name: t('list.sort.createdAtAsc') },
    { value: 'createdAt-desc', name: t('list.sort.createdAtDesc') },
    { value: 'updatedAt-asc', name: t('list.sort.updatedAtAsc') },
    { value: 'updatedAt-desc', name: t('list.sort.updatedAtDesc') }
  ]

  const orderedFlows = useMemo(() => {
    const [field, direction] = sortOption.split('-') as ['name' | 'createdAt' | 'updatedAt', 'asc' | 'desc']
    const directionMultiplier = direction === 'asc' ? 1 : -1

    return [...flows].sort((a, b) => {
      const firstValue = String(a[field] ?? '')
      const secondValue = String(b[field] ?? '')
      const comparison = firstValue.localeCompare(secondValue, undefined, { numeric: true, sensitivity: 'base' })

      if (comparison !== 0) return comparison * directionMultiplier

      const nameComparison = String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
      return nameComparison !== 0 ? nameComparison : a.id - b.id
    })
  }, [flows, sortOption])

  const filteredFlows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (query === '') return orderedFlows

    return orderedFlows.filter((flow) => {
      const name = String(flow?.name ?? '').toLowerCase()
      const description = String(flow?.description ?? '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [orderedFlows, searchQuery])

  const { responsiveMode } = useResponsiveStore()
  const isMobile = responsiveMode !== 'PC' ? true : false

  const total = filteredFlows.length

  const handleClickCanvas = (flowId: number) => {
    navigate(`/tms/taskflows/${flowId}/canvas`)
  }

  const handleClickDetail = (flowId: number) => {
    navigate(`/tms/taskflows/${flowId}/detail`)
  }

  const handleCreate = () => {
    navigate('/tms/taskflows/0/canvas')
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds([])
  }

  const handleToggleSelect = (flowId: number) => {
    setSelectedIds((prev) => (prev.includes(flowId) ? prev.filter((id) => id !== flowId) : [...prev, flowId]))
  }

  /**
   * 선택한 Task Flow 들을 한 번에 복제한다.
   * 복제 이름("원본 복제1, 복제2")이 목록 기준으로 매겨지므로 순차로 처리해야 번호가 겹치지 않는다.
   */
  const handleCopySelected = async () => {
    if (bulkCopying) return

    const targets = selectedIds.filter((id) => flows.some((flow) => flow.id === id))
    if (targets.length === 0) return

    setBulkCopying(true)

    let successCount = 0
    let firstError = ''

    for (const id of targets) {
      try {
        await copyFlow(id)
        successCount += 1
      } catch (e: any) {
        console.error('[TaskFlow 복제 실패]', id, e)
        if (!firstError) firstError = e?.response?.data?.message || e?.message || ''
      }
    }

    const failCount = targets.length - successCount

    if (failCount > 0) {
      setCopyErrorMessage(
        `${t('list.copyBulkPartialDesc', { successCount, failCount })}${firstError
          ? `
${firstError}`
          : ''
        }`
      )
    } else {
      setCopyResultMessage(t('list.copyBulkDoneDesc', { count: successCount }))
    }

    await refreshFlows(selectedOrgs?.[0] ?? null, selectedOrgs?.[1] ?? null)

    setBulkCopying(false)
    exitSelectMode()
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleResetSearch = () => {
    setSearchQuery('')
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

      const reversedRobotId = taskFlowCandidates.length > 0 && robotCandidates.length > 0 && /^\d+$/.test(robotCandidates[0]) && !/^\d+$/.test(taskFlowCandidates[0]) ? taskFlowCandidates[0] : ''
      const reversedTaskFlowId = taskFlowCandidates.length > 0 && robotCandidates.length > 0 && /^\d+$/.test(robotCandidates[0]) && !/^\d+$/.test(taskFlowCandidates[0]) ? Number(robotCandidates[0]) : NaN

      const fallbackTaskFlowId = Number(explicitTaskFlowId || '')
      const robotId = reversedRobotId || explicitRobotId || ''
      const taskFlowId = Number.isFinite(reversedTaskFlowId) ? reversedTaskFlowId : Number(explicitTaskFlowId || '')
      const resolvedGroupId = String(selectedOrgs?.[0] ?? '').trim() || null
      const resolvedSiteId = String(selectedOrgs?.[1] ?? '').trim() || null

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

      if (!robotId || !Number.isFinite(taskFlowId) || taskFlowId <= 0 || (!resolvedGroupId && type === 'deploy-taskflow') || (!resolvedSiteId && type === 'deploy-taskflow')) {
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 대상 정보를 찾지 못했습니다.'))
        return
      }

      try {
        if (type === 'deploy-taskflow') {
          const deployPayload: DeployActionRequest = {
            taskFlowId,
            param: {
              action: 'DEPLOY',
              groupId: resolvedGroupId,
              siteId: resolvedSiteId,
              robotInfos: [{
                groupId: String(resolvedGroupId ?? ''),
                siteId: String(resolvedSiteId ?? ''),
                id: robotId
              }],
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

          dispatchResult(true, String(custom?.detail?.replyText || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 배포를 요청했습니다.`))
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

        const actionType = instantActionTypeMap[type] ?? 'start'
        const instantPayload: InstantActionsRequest = {
          deviceId: robotId,
          body: {
            userId,
            actions: [{
              actionType,
              actionId: crypto.randomUUID(),
              blockingType: 'HARD',
              actionParameters: [{ key: 'tms_id', value: String(taskFlowId) }]
            }]
          }
        }

        console.info('[AI_TASKFLOW][INSTANT_ACTION_CALL]', { type, robotId, taskFlowId, actionType, payload: instantPayload })

        const instantResult = await sendInstantActionAsync(instantPayload)
        console.info('[AI_TASKFLOW][INSTANT_ACTION_RESULT]', { type, robotId, taskFlowId, actionType, result: instantResult })

        const defaultReplyMap: Record<string, string> = {
          'run-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 실행을 요청했습니다.`,
          'pause-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 일시정지를 요청했습니다.`,
          'resume-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 재개를 요청했습니다.`,
          'stop-taskflow': `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 정지를 요청했습니다.`
        }

        dispatchResult(true, String(custom?.detail?.replyText || defaultReplyMap[type] || `${robotId} 로봇에서 ${taskFlowId} 태스크플로우 제어를 요청했습니다.`))
      } catch (error) {
        console.error('[AI_TASKFLOW][COMMAND_RUN_FAILED]', error)
        dispatchResult(false, String(command?.notFoundText ?? '배포/실행 요청에 실패했습니다.'))
      }
    }

    window.addEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
    return () => window.removeEventListener(AI_TASKFLOW_CANVAS_COMMAND_EVENT, onTaskflowCanvasCommand)
  }, [deployTaskFlowActionAsync, sendInstantActionAsync, selectedOrgs, session?.userId])

  return (
    <StyledPageContent className="column">
      <Title>{t('list.title')}</Title>
      <OrganizationSelector onChange={handleOrgChange} supportAlls={[true, true]} />

      <Section>
        <HeaderTitleGroup>
          <ListControls>
            <SearchContainer>
              <Search
                label={t('common:searchPlaceHolder')}
                width="250px"
                value={searchQuery}
                onChange={handleSearchChange}
                onReset={handleResetSearch}
                placeholder={t('list.searchPlaceholder')}
              />
            </SearchContainer>
            <Dropdown
              label={t('list.sort_label')}
              size="lg"
              minWidth="200px"
              value={sortOption}
              options={sortOptions}
              useSelectedIcon
              onChange={(value: TaskFlowSortOption) => setSortOption(value)}
            />
          </ListControls>

          {!isMobile && (
            <ButtonWrap className="alignRight" style={{ marginBottom: '0' }}>
              <Button variant="contained" style={{ whiteSpace: 'nowrap' }} onClick={handleCreate}>
                {t('list.create')}
              </Button>

              {selectMode && selectedIds.length > 0 && (
                <Button
                  theme="primary"
                  type="button"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={handleCopySelected}
                  disabled={bulkCopying}
                >
                  {bulkCopying ? t('list.copying') : t('list.copySelected', { count: selectedIds.length })}
                </Button>
              )}

              <Button
                theme="tertiary"
                type="button"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                disabled={bulkCopying}
              >
                {selectMode ? t('list.selectCancel') : t('list.select')}
              </Button>
            </ButtonWrap>
          )}
        </HeaderTitleGroup>

        {filteredFlows.length === 0 ? (
          <NoData>{t('list.noData')}</NoData>
        ) : (
          <Suspense fallback={<div>Loading...</div>}>
            <div style={{ margin: '16px 0', fontSize: '14px', fontWeight: 'bold' }}>
              {t('list.totalCount', { count: total })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredFlows.map((flow, idx) => (
                <TaskFlowListRow
                  key={flow.id ?? idx}
                  flow={flow}
                  onClickCanvas={handleClickCanvas}
                  onClickDetail={handleClickDetail}
                  selectMode={selectMode}
                  selected={selectedIds.includes(flow.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          </Suspense>
        )}
      </Section>

      <ConfirmModal
        open={copyResultMessage !== ''}
        title={t('list.copyDoneTitle')}
        description={copyResultMessage}
        showCancelButton={false}
        closeOnOverlayClick
        onCancel={() => setCopyResultMessage('')}
        onConfirm={() => setCopyResultMessage('')}
      />

      <ConfirmModal
        open={copyErrorMessage !== ''}
        title={t('list.copyFailTitle')}
        description={copyErrorMessage}
        showCancelButton={false}
        closeOnOverlayClick
        onCancel={() => setCopyErrorMessage('')}
        onConfirm={() => setCopyErrorMessage('')}
      />
    </StyledPageContent>
  )
}
