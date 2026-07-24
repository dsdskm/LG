import { useTranslation } from 'react-i18next'
import { Icon, Title as UiTitle } from '@repo/ui'
import { Undo, Redo } from '@/assets'
import { getTaskFlowStatusLabel } from '@/utils/taskflowStatus'
import {
  Description,
  HeaderDivider,
  HeaderRoot,
  IconButton,
  Left,
  PrimaryButton,
  Right,
  SecondaryButton,
  StatusPill,
  TitleRow
} from './styles'

type Props = {
  title?: string
  description?: string
  status?: string
  onBack?: () => void
  onEditInfo?: () => void
  onTempSave?: () => void
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onResetAllNodes?: () => void
  canUndo?: boolean
  canRedo?: boolean
  tempSaveDisabled?: boolean
  saveDisabled?: boolean
  saving?: boolean
  tempSaving?: boolean
}

export default function TaskFlowCanvasHeader({
  title = 'Task Flow',
  description,
  status,
  onBack,
  onEditInfo,
  onTempSave,
  onSave,
  onUndo,
  onRedo,
  onResetAllNodes,
  canUndo = false,
  canRedo = false,
  tempSaveDisabled = false,
  saveDisabled = false,
  saving = false,
  tempSaving = false
}: Props) {
  const { t } = useTranslation(['tms', 'common'])
  const desc = (description ?? '').trim()

  return (
    <HeaderRoot>
      <Left>
        <TitleRow>
          <UiTitle onBack={onBack}>{title}</UiTitle>

          {status ? <StatusPill>{getTaskFlowStatusLabel(status, t)}</StatusPill> : null}
          {desc ? <Description title={desc}>{desc}</Description> : null}
        </TitleRow>
      </Left>

      <Right>
        <IconButton
          type="button"
          onClick={onUndo}
          disabled={!onUndo || !canUndo || saving || tempSaving}
          title={t('canvas.header.undoTitle')}
          aria-label={t('canvas.header.undo')}
        >
          <Undo width={20} height={20} />
        </IconButton>

        <IconButton
          type="button"
          onClick={onRedo}
          disabled={!onRedo || !canRedo || saving || tempSaving}
          title={t('canvas.header.redoTitle')}
          aria-label={t('canvas.header.redo')}
        >
          <Redo width={20} height={20} />
        </IconButton>

        <HeaderDivider />

        <SecondaryButton
          type="button"
          onClick={onResetAllNodes}
          disabled={!onResetAllNodes || saving || tempSaving}
          title="Start 노드를 제외한 전체 노드를 삭제합니다."
        >
          <Icon name="delete" size={18} />
          전체 노드 초기화
        </SecondaryButton>

        <SecondaryButton
          type="button"
          onClick={onEditInfo}
          disabled={!onEditInfo || saving || tempSaving}
          title={t('canvas.header.editInfoTitle')}
        >
          <Icon name="info" size={20} />
          {t('canvas.header.editInfo')}
        </SecondaryButton>

        <SecondaryButton
          type="button"
          onClick={onTempSave}
          disabled={!onTempSave || tempSaveDisabled || tempSaving || saving}
          title={
            !onTempSave
              ? t('canvas.header.tempSaveNotConnected')
              : tempSaveDisabled
                ? t('canvas.header.tempSaveNoChanges')
                : t('canvas.header.tempSave')
          }
        >
          <Icon name="info" size={20} />
          {tempSaving ? t('canvas.header.tempSaving') : t('canvas.header.tempSave')}
        </SecondaryButton>

        <PrimaryButton
          type="button"
          onClick={onSave}
          disabled={!onSave || saveDisabled || saving || tempSaving}
          title={
            !onSave
              ? t('canvas.header.saveNotConnected')
              : saveDisabled
                ? t('canvas.header.saveNoChanges')
                : t('canvas.header.save')
          }
        >
          <Icon name="info" size={20} />
          {saving ? t('canvas.header.saving') : t('canvas.header.save')}
        </PrimaryButton>
      </Right>
    </HeaderRoot>
  )
}