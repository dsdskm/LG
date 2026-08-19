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
          flexWrap: 'wrap',
          rowGap: '8px',
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            alignItems: 'center',
            flexGrow: 1,
            minWidth: '200px'
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{taskFlow.name}</div>
          <div style={{ fontSize: '14px' }}>v{taskFlow.version}</div>

          {taskFlow.operationStatus === 'RUNNING' && (
            <>
              <Div />
              <RunningBadge>
                <RunningDot />
                실행중
              </RunningBadge>
            </>
          )}
          {/* {taskFlow.isActive && <ActiveBadge>{t('robotDetail.active')}</ActiveBadge>} */}
          {!taskFlow.isActive && (
            <>
              {' '}
              <Div />
              <InactiveBadge>{t('robotDetail.inactive')}</InactiveBadge>{' '}
            </>
          )}
        </div>
        {/* 스크롤 컨테이너: 줄바꿈은 flexShrink:0 로 유지하되, 한 줄 폭을 넘기면 maxWidth:100% 로 잘리고 overflowX 로 스크롤 */}
        <div style={{ flexShrink: 0, minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
          {/* 내부 실제 폭: 버튼들이 줄어들지 않도록 자연 폭(max-content) 유지 → 넘치면 위 컨테이너가 스크롤 */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 'max-content' }}>
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
      </div>
    </>
  )
}

export default TaskFlowItem
