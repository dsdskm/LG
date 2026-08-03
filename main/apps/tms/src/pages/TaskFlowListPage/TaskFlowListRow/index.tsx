import { Icon, Button } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Card,
  CardLeft,
  CardRight,
  FlowMain,
  FlowTitleRow,
  FlowVersionBadge,
  FlowActiveBadge,
  FlowInactiveBadge,
  FlowDesc,
  DeployStatusBadgeSuccess,
  DeployStatusBadgeProgress,
  DeployStatusBadgeMuted,
  DeployStatusBadgeError,
  UpdatedAtText,
  RightTopRow,
  RightBottomRow,
  RightInfoColumn
} from './styles'
import { TaskFlowWithDeployment, TaskFlowStatus, DeploymentStatus } from '@/types/taskflow'
import { getTaskFlowStatusLabel } from '@/utils/taskflowStatus'
import { convertDateToString } from '@repo/utils'
import { TextAlignStart } from 'lucide-react'
function EmptyValue() {
  return <>-</>
}

function getVersionText(flow: TaskFlowWithDeployment) {
  return `v${flow.version}`
}

function renderFlowStatusBadge(flow: TaskFlowWithDeployment, t: TFunction) {
  const status = flow?.status as TaskFlowStatus | undefined
  const statusText = getTaskFlowStatusLabel(status, t)

  if (status === TaskFlowStatus.ACTIVE) {
    return (
      <FlowActiveBadge>
        <span className="dot" />
        {statusText}
      </FlowActiveBadge>
    )
  }

  return (
    <FlowInactiveBadge>
      <span className="dot" />
      {statusText}
    </FlowInactiveBadge>
  )
}

function renderDeployStatusBadge(flow: TaskFlowWithDeployment, t: TFunction) {
  const deployment = flow?.deployment

  // 배포 이력이 없으면 deployment 자체가 없음
  if (!deployment) {
    return <></>
  }

  const status = deployment.status
  // tms_be: deployments.constants.ts 의 DeploymentStatus 라벨 (키는 enum 값)
  const label = t(`list.deployStatus.${status}`, { defaultValue: status })

  if (status === DeploymentStatus.COMPLETED) {
    return (
      <DeployStatusBadgeSuccess>
        <Icon name="ok" size={18} />
        {label}
      </DeployStatusBadgeSuccess>
    )
  }

  if (status === DeploymentStatus.PENDING) {
    return (
      <DeployStatusBadgeProgress>
        <Icon name="time" size={18} />
        {label}
      </DeployStatusBadgeProgress>
    )
  }

  if (status === DeploymentStatus.IN_PROGRESS) {
    return (
      <DeployStatusBadgeProgress>
        <Icon name="refresh" size={18} />
        {label}
      </DeployStatusBadgeProgress>
    )
  }

  if (status === DeploymentStatus.DELETION_IN_PROGRESS) {
    return (
      <DeployStatusBadgeError>
        <Icon name="delete" size={18} />
        {label}
      </DeployStatusBadgeError>
    )
  }

  if (status === DeploymentStatus.CANCELED) {
    return (
      <DeployStatusBadgeError>
        <Icon name="error" size={18} />
        {label}
      </DeployStatusBadgeError>
    )
  }

  return (
    <DeployStatusBadgeMuted>
      <Icon name="info" size={18} />
      {label}
    </DeployStatusBadgeMuted>
  )
}

function getDeployDateText(flow: TaskFlowWithDeployment) {
  const deployment = flow?.deployment
  if (!deployment) {
    return ''
  }
  return (
    <>
      <Icon name="time" size={16} />
      {convertDateToString(deployment.completedAt ?? deployment.createdAt)}
    </>
  )
}

interface TaskFlowListRowProps {
  flow: TaskFlowWithDeployment
  onClickCanvas: (flowId: number) => void
  onClickDetail: (flowId: number) => void
}

export default function TaskFlowListRow({ flow, onClickCanvas, onClickDetail }: TaskFlowListRowProps) {
  const { t } = useTranslation(['tms', 'common'])
  return (
    <Card>
      <CardLeft>
        <FlowMain>
          <FlowTitleRow>
            <span style={{ lineHeight: 1.4 }}>{flow.name || <EmptyValue />}</span>

            <FlowVersionBadge>{getVersionText(flow)}</FlowVersionBadge>
            {renderFlowStatusBadge(flow, t)}
          </FlowTitleRow>

          {flow.description && <FlowDesc>{flow.description}</FlowDesc>}
        </FlowMain>
      </CardLeft>

      <CardRight>
        <RightInfoColumn>
          <RightTopRow>{renderDeployStatusBadge(flow, t)}</RightTopRow>

          <RightBottomRow>
            <UpdatedAtText>{getDeployDateText(flow)}</UpdatedAtText>
          </RightBottomRow>
        </RightInfoColumn>

        <Button theme="tertiary" size="md" type="button" onClick={() => flow.id > 0 && onClickDetail(flow.id)}>
          {t('common:detail')}
          <Icon name="arrow_right" size={18} />
        </Button>
      </CardRight>
    </Card>
  )
}
