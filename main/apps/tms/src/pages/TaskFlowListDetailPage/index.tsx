import React, { useEffect, useMemo, useRef, useState } from 'react'
import { data, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { useGetTaskFlow, useDeleteTaskFlow, useDeployTaskFlowAction } from '@/api/taskFlowApis'
import { DeployActionRequest, DeployActionType, DeploymentStatus, TaskFlowStatus, Deployment } from '@/types/taskflow'
import ConfirmModal from '@/pages/components/modal/ConfirmModal'
import { getTaskFlowStatusLabel } from '@/utils/taskflowStatus'
import { EXECUTION_CONDITION_KEY } from '@/common/constants'
import TaskFlowReadonlyCanvas from '../TaskFlowCanvasPage/FlowCanvasViewer'
import { Icon, Title, Button, Tabs, Tab } from '@repo/ui'

import {
  Container,
  HeaderRight,
  HeaderButtonGroup,
  MoreMenuWrapper,
  DropdownMenu,
  DropdownMenuItem,
  Section,
  FlowTabsWrap,
  FlowArea,
  FlowCanvasWrap,
  PageMessage,
  Header,
  HeaderLeft,
  SummaryGrid,
  SummaryCard,
  SummaryCardHeader,
  SummaryCardTitle,
  SummaryCardHeaderRight,
  SummaryTable,
  SummaryValueStrong,
  StatusBadgeActive,
  StatusBadgeInactive,
  StatusBadgeDraft,
  DeployBadgePending,
  DeployBadgeSuccess,
  DeployBadgeError,
  DeployCountSuccess,
  DeployCountError,
  DeployCountPending,
  TableCellRight,
  TableCellLeft
} from './styles'

import {
  FLOW_SOURCE_QUERY_KEY,
  getFlowDefinitionBySource,
  hasFinal,
  hasSaved,
  type FlowDefinitionSource
} from '@/utils/flowDefinition'

import {
  type PendingAction,
  type SubmitState,
  getConfirmDialogContent,
  getSuccessDialogContent,
  getErrorDialogTitle
} from './util'
import { useOrganizationStore, useResponsiveStore } from '@repo/stores'
import { DeviceParams, DeviceResponse } from '@/types/api/device'
import { useDeviceList } from '@/api/deviceApis'
import { CenteredContent } from '../RobotDetailPage/styles'

function formatDateTime(value?: string | null) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

function renderStatusBadge(status: TaskFlowStatus | null | undefined, t: TFunction) {
  const label = getTaskFlowStatusLabel(status, t)

  if (status === TaskFlowStatus.ACTIVE) {
    return (
      <StatusBadgeActive>
        <span className="dot" />
        {label}
      </StatusBadgeActive>
    )
  }

  if (status === TaskFlowStatus.DRAFT) {
    return (
      <StatusBadgeDraft>
        <span className="dot" />
        {label}
      </StatusBadgeDraft>
    )
  }

  return (
    <StatusBadgeInactive>
      <span className="dot" />
      {label}
    </StatusBadgeInactive>
  )
}

function getDeployStatusLabel(status: string | null | undefined, t: TFunction) {
  if (status === DeploymentStatus.PENDING) return t('detail.deployStatus.PENDING')
  if (status === DeploymentStatus.IN_PROGRESS) return t('detail.deployStatus.IN_PROGRESS')
  if (status === DeploymentStatus.COMPLETED) return t('detail.deployStatus.COMPLETED')
  if (status === DeploymentStatus.CANCELED) return t('detail.deployStatus.CANCELED')
  if (status === DeploymentStatus.DELETION_IN_PROGRESS) return t('detail.deployStatus.DELETION_IN_PROGRESS')
  return ''
}

const TaskFlowListDetailPage = () => {
  const { t } = useTranslation(['tms', 'common'])
  const navigate = useNavigate()
  const { taskFlowId } = useParams()

  const id = Number(taskFlowId)
  const isValidId = Number.isFinite(id) && id > 0

  const {
    data: taskFlow,
    isLoading,
    isError,
    error,
    refetch: taskFlowRefetch
  } = useGetTaskFlow(isValidId ? id : -1, { include: 'lastDeployment' })

  // 최근 배포: include=lastDeployment 로 함께 내려온 마지막 배포 정보 (없으면 null)
  const recentDeployment = useMemo<Deployment | null>(() => {
    return ((taskFlow as any)?.deployment as Deployment | undefined) ?? null
  }, [taskFlow])

  // 보여줄 정의 선택: "저장 버전"(flowDefinitionDraft) / "최종 버전"(flowDefinition)
  const [flowSource, setFlowSource] = useState<FlowDefinitionSource>('saved')

  // 저장 버전이 없으면 최종 버전 탭을 기본으로 연다.
  useEffect(() => {
    if (!taskFlow) return
    if (!hasSaved(taskFlow) && hasFinal(taskFlow)) setFlowSource('final')
  }, [taskFlow])

  const selectedFlowDefinition = useMemo(() => getFlowDefinitionBySource(taskFlow, flowSource), [taskFlow, flowSource])

  // 실행 조건: 선택된 정의의 nodes 중 startNode 의 data.properties.execution_condition
  const executionCondition = useMemo(() => {
    const nodes = (selectedFlowDefinition as any)?.nodes
    if (!Array.isArray(nodes)) return ''
    const startNode = nodes.find((node: any) => node?.type === 'startNode')
    const value = startNode?.data?.properties?.[EXECUTION_CONDITION_KEY]
    return value == null ? '' : String(value)
  }, [selectedFlowDefinition])

  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState<SubmitState>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const [resultOpen, setResultOpen] = useState(false)
  const [resultTitle, setResultTitle] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [resultAction, setResultAction] = useState<Exclude<PendingAction, null> | null>(null)

  const [errorOpen, setErrorOpen] = useState(false)
  const [errorTitle, setErrorTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const { selectedOrgs } = useOrganizationStore()

  const moreMenuRef = useRef<HTMLDivElement | null>(null)

  const { mutateAsync: deployActionMutateAsync } = useDeployTaskFlowAction()
  const { mutateAsync: deleteTaskFlowAsync } = useDeleteTaskFlow()

  const deviceRequest = useMemo(() => {
    let nextParams: DeviceParams | undefined = undefined

    const [selectedGroupId, selectedSiteId] = selectedOrgs

    console.log('selectedOrgs group', selectedGroupId, ' site ', selectedSiteId)

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

  const { refetch: deviceRefetch } = useDeviceList(deviceRequest, false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const { responsiveMode } = useResponsiveStore()
  const isMobile = responsiveMode !== 'PC' ? true : false

  // 어느 탭을 보고 있든 수정은 항상 저장 버전(flowDefinitionDraft)을 연다.
  const handleEdit = () => {
    if (!taskFlow?.id) return
    navigate(`/tms/taskflows/${taskFlow.id}/canvas?${FLOW_SOURCE_QUERY_KEY}=saved`)
  }

  const handleDeployManage = () => {
    if (!taskFlow?.id) return

    navigate(`/tms/taskflows/${taskFlow.id}/detail/deploy`)
  }

  const openConfirmDialog = (action: Exclude<PendingAction, null>) => {
    if (!taskFlow?.id || isSubmitting) return

    setIsMoreOpen(false)

    window.setTimeout(() => {
      setPendingAction(action)
      setConfirmOpen(true)
    }, 0)
  }

  const handleActivateClick = () => {
    openConfirmDialog('activate')
  }

  const handleDeactivateClick = () => {
    openConfirmDialog('deactivate')
  }

  const handleDeleteClick = () => {
    openConfirmDialog('delete')
  }

  const closeConfirmDialog = () => {
    if (isSubmitting) return
    setConfirmOpen(false)
    setPendingAction(null)
  }

  const openSuccessDialog = (action: Exclude<PendingAction, null>, taskFlowName: string) => {
    const { title, message } = getSuccessDialogContent(action, taskFlowName, t)
    setResultAction(action)
    setResultTitle(title)
    setResultMessage(message)
    setResultOpen(true)
  }

  const openErrorDialog = (action: PendingAction, message: string) => {
    setErrorTitle(getErrorDialogTitle(action, t))
    setErrorMessage(message)
    setErrorOpen(true)
  }
  function makeActionRequest(action: string, deivces?: DeviceResponse[]): DeployActionRequest {
    const [selectedGroupId, selectedSiteId] = selectedOrgs
    return {
      taskFlowId: id,
      param: {
        action: action as DeployActionType,
        groupId: selectedGroupId ?? null,
        siteId: selectedSiteId ?? null,
        robotInfos: null,
        description: 'fixme'
        //...(deivces ? { robotIds: deivces?.map((device) => device.deviceId) ?? [] } : {})
      }
    }
  }
  const executePendingAction = async () => {
    if (!taskFlow?.id || !pendingAction || isSubmitting) return

    try {
      setIsSubmitting(pendingAction)

      if (pendingAction === 'activate') {
        await deployActionMutateAsync(makeActionRequest('ACTIVATE'))

        setConfirmOpen(false)
        setPendingAction(null)
        await taskFlowRefetch()
        openSuccessDialog('activate', taskFlow.name)
        return
      }

      if (pendingAction === 'deactivate') {
        await deployActionMutateAsync(makeActionRequest('DEACTIVATE'))
        setConfirmOpen(false)
        setPendingAction(null)
        await taskFlowRefetch()
        openSuccessDialog('deactivate', taskFlow.name)
        return
      }

      if (pendingAction === 'delete') {
        const result = await deviceRefetch()
        console.log('device', result.data)

        await deployActionMutateAsync(makeActionRequest('UNDEPLOY', result.data?.content ?? []))
        await deleteTaskFlowAsync(taskFlow.id)

        setConfirmOpen(false)
        setPendingAction(null)

        openSuccessDialog('delete', taskFlow.name)
        return
      }
    } catch (e: any) {
      console.error('TaskFlow 액션 처리 실패:', e)

      setConfirmOpen(false)

      const message = e?.response?.data?.message || e?.message || t('detail.processError')

      openErrorDialog(pendingAction, message)
      setPendingAction(null)
    } finally {
      setIsSubmitting(null)
    }
  }

  const closeResultDialog = () => {
    setResultOpen(false)

    if (resultAction === 'delete') {
      navigate('/tms')
    }
  }

  const showActivateMenu = taskFlow?.status === TaskFlowStatus.INACTIVE
  const showDeactivateMenu = taskFlow?.status === TaskFlowStatus.ACTIVE

  const confirmDialog = useMemo(() => {
    return getConfirmDialogContent(pendingAction, taskFlow?.name ?? '', isSubmitting, t)
  }, [pendingAction, taskFlow?.name, isSubmitting, t])

  if (!isValidId) {
    return (
      <Container>
        <PageMessage>{t('detail.invalidAccess')}</PageMessage>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container>
        <PageMessage>Loading...</PageMessage>
      </Container>
    )
  }

  if (isError) {
    return (
      <Container>
        <PageMessage>
          {t('detail.loadError')}
          {error instanceof Error ? ` (${error.message})` : ''}
        </PageMessage>
      </Container>
    )
  }

  if (!taskFlow) {
    return (
      <Container>
        <PageMessage>{t('detail.noData')}</PageMessage>
      </Container>
    )
  }
  console.log(`taskFlow`, taskFlow)
  return (
    <Container>
      <Header style={{ flexWrap: 'wrap', gap: '8px' }}>
        <HeaderLeft>
          <Title onBack={() => navigate('/tms')}>{taskFlow.name}</Title>
        </HeaderLeft>

        <HeaderRight>
          <HeaderButtonGroup>
            {!isMobile && (
              <Button theme="secondary" type="button" onClick={handleEdit} disabled={!!isSubmitting}>
                <Icon name="edit" size={18} />
                {t('detail.edit')}
              </Button>
            )}

            <Button theme="primary" type="button" onClick={handleDeployManage} disabled={!!isSubmitting}>
              <Icon name="robot" size={18} />
              {t('detail.deployManage')}
            </Button>

            <MoreMenuWrapper ref={moreMenuRef}>
              <Button
                theme="secondary"
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                disabled={!!isSubmitting}
              >
                <Icon name="more" size={18} />
                {t('detail.more')}
                <Icon name="arrow_down" size={18} />
              </Button>

              {isMoreOpen && (
                <DropdownMenu>
                  {showActivateMenu && (
                    <DropdownMenuItem type="button" onClick={handleActivateClick} disabled={!!isSubmitting}>
                      {t('detail.activate')}
                    </DropdownMenuItem>
                  )}

                  {showDeactivateMenu && (
                    <DropdownMenuItem type="button" onClick={handleDeactivateClick} disabled={!!isSubmitting}>
                      {t('detail.deactivate')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem type="button" $danger onClick={handleDeleteClick} disabled={!!isSubmitting}>
                    {t('actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </MoreMenuWrapper>
          </HeaderButtonGroup>
        </HeaderRight>
      </Header>
      <CenteredContent>
        <SummaryGrid>
          <SummaryCard>
            <SummaryTable>
              <tbody>
                <tr>
                  <th>{t('detail.description')}</th>
                  <td>
                    <TableCellRight>{taskFlow.description || ''}</TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.versionInfo')}</th>
                  <td>
                    <TableCellRight>
                      <SummaryValueStrong>v{taskFlow.version ?? ''}</SummaryValueStrong>
                    </TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.statusLabel')}</th>
                  <td>
                    <TableCellRight>{renderStatusBadge(taskFlow.status, t)}</TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.requiredSkill')}</th>
                  <td>
                    <TableCellRight>
                      {taskFlow.robotSkillInfos
                        ?.map((skill) => skill.displayName)
                        .filter(Boolean)
                        .join(', ') || ''}
                    </TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.executionCondition')}</th>
                  <td>
                    <TableCellRight>{executionCondition || ''}</TableCellRight>
                  </td>
                </tr>
              </tbody>
            </SummaryTable>
          </SummaryCard>

          <SummaryCard>
            <SummaryCardHeader>
              <SummaryCardTitle>{t('detail.cumulativeDeploy')}</SummaryCardTitle>
              <SummaryCardHeaderRight>
                <SummaryValueStrong>
                  {t('detail.unit', { count: recentDeployment?.totalSuccessRobotCount ?? 0 })}
                </SummaryValueStrong>
              </SummaryCardHeaderRight>
            </SummaryCardHeader>

            <SummaryTable>
              <tbody>
                <tr>
                  <th>{t('detail.recentDeploy')}</th>
                  <td>
                    <TableCellRight>
                      {recentDeployment ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{formatDateTime(recentDeployment.createdAt)}</span>
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.deploySuccess')}</th>
                  <td>
                    <TableCellRight>
                      <DeployCountSuccess>
                        <Icon name="ok" size={16} />
                        {t('detail.unit', { count: recentDeployment?.latestSuccessRobotCount ?? 0 })}
                      </DeployCountSuccess>
                    </TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.deployFail')}</th>
                  <td>
                    <TableCellRight>
                      <DeployCountError>
                        <Icon name="error" size={16} />
                        {t('detail.unit', { count: recentDeployment?.latestFailedRobotCount ?? 0 })}
                      </DeployCountError>
                    </TableCellRight>
                  </td>
                </tr>
                <tr>
                  <th>{t('detail.deployPending')}</th>
                  <td>
                    <TableCellRight>
                      <DeployCountPending>
                        <Icon name="info" size={16} />
                        {t('detail.unit', { count: recentDeployment?.latestPendingRobotCount ?? 0 })}
                      </DeployCountPending>
                    </TableCellRight>
                  </td>
                </tr>
              </tbody>
            </SummaryTable>
          </SummaryCard>
        </SummaryGrid>
      </CenteredContent>

      <CenteredContent>
        <Section>
          <FlowTabsWrap>
            <Tabs activeId={flowSource} onChange={(id: string) => setFlowSource(id as FlowDefinitionSource)}>
              <Tab id="saved" label={t('detail.flowTab.saved')}>
                <FlowArea>
                  <FlowCanvasWrap>
                    {hasSaved(taskFlow) ? (
                      <TaskFlowReadonlyCanvas flowDefinition={selectedFlowDefinition} />
                    ) : (
                      <PageMessage>{t('detail.flowTab.savedEmpty')}</PageMessage>
                    )}
                  </FlowCanvasWrap>
                </FlowArea>
              </Tab>

              <Tab id="final" label={t('detail.flowTab.final')}>
                <FlowArea>
                  <FlowCanvasWrap>
                    {hasFinal(taskFlow) ? (
                      <TaskFlowReadonlyCanvas flowDefinition={selectedFlowDefinition} />
                    ) : (
                      <PageMessage>{t('detail.flowTab.finalEmpty')}</PageMessage>
                    )}
                  </FlowCanvasWrap>
                </FlowArea>
              </Tab>
            </Tabs>
          </FlowTabsWrap>
        </Section>
      </CenteredContent>

      <ConfirmModal
        open={confirmOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        confirmDisabled={!!isSubmitting}
        onCancel={closeConfirmDialog}
        onConfirm={executePendingAction}
        confirmVariant={pendingAction === 'delete' ? 'danger' : 'primary'}
      />

      <ConfirmModal
        open={resultOpen}
        title={resultTitle}
        description={resultMessage}
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={closeResultDialog}
        onConfirm={closeResultDialog}
      />

      <ConfirmModal
        open={errorOpen}
        title={errorTitle}
        description={errorMessage}
        showCancelButton={false}
        closeOnOverlayClick={true}
        onCancel={() => setErrorOpen(false)}
        onConfirm={() => setErrorOpen(false)}
      />
    </Container>
  )
}

export default TaskFlowListDetailPage
