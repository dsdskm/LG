import { RobotTaskFlow } from '@/types/api/device'
import TaskFlowControlButton, { Control } from './TaskFlowControlButton'
import { TaskFlowRunningStatus } from '@/types/RobotInfo'
import { Div } from '@/assets'
import { useTranslation } from 'react-i18next'
import './TaskFlowItem.css'
import { ActiveBadge, InactiveBadge, RunningBadge, RunningDot } from '../styles'
import TaskFlowSwitchButton from './TaskFlowSwitchButton'

interface TaskFlowItemProps {
  taskFlow: RobotTaskFlow
  controlList: Control[]
  settingList: [Control[]]
  onListClicked: (listId: number) => void
  selectedId: number
}
const TaskFlowItem = ({ taskFlow, controlList, settingList, selectedId, onListClicked }: TaskFlowItemProps) => {
  const { t } = useTranslation('tms')
  const selected = selectedId === taskFlow.id
  return (
    <>
      <div
        className={`taskflow-list ${selected ? 'selected' : 'unselected'}`}
        key={taskFlow.id}
        style={{
          display: 'flex',
          flexDirection: 'row',
          textAlign: 'start',
          color: selected ? '#7BA5C1' : '#383838',
          border: '1px solid var(--color-secondary-20)',
          borderRadius: '8px',
          backgroundColor: selected ? '#eff6ff' : undefined,
          padding: '10px 16px',
          transition: 'all 0.2s',
          minHeight: '60px',
          alignContent: 'center',
          justifyContent: 'space-between'
        }}
        onClick={() => onListClicked(taskFlow.id)}
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{taskFlow.name}</div>
          <div style={{ fontSize: '14px' }}>v{taskFlow.version}</div>
          <Div />
          {taskFlow.operationStatus === 'RUNNING' && (
            <RunningBadge>
              <RunningDot />
              실행중
            </RunningBadge>
          )}
          {taskFlow.isActive && <ActiveBadge>{t('robotDetail.active')}</ActiveBadge>}
          {!taskFlow.isActive && <InactiveBadge>{t('robotDetail.inactive')}</InactiveBadge>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          {controlList?.map((control) => (
            <TaskFlowControlButton
              control={control}
              taskFlowId={taskFlow.id}
              isTaskFlowActive={taskFlow.isActive}
              isTaskFlowUsing={taskFlow.isEnabled}
              taskFlowRunningStatus={taskFlow.operationStatus as TaskFlowRunningStatus}
            />
          ))}
          {settingList && <Div style={{ marginLeft: 10 }} />}
          {settingList?.map((setting) => (
            <TaskFlowSwitchButton
              controls={setting}
              taskFlowId={taskFlow.id}
              isTaskFlowActive={taskFlow.isActive}
              isTaskFlowUsing={taskFlow.isEnabled}
              taskFlowRunningStatus={taskFlow.operationStatus as TaskFlowRunningStatus}
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default TaskFlowItem
