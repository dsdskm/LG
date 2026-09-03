import { TaskFlowRunningStatus } from '@/types/RobotInfo'
import './TaskFlowControlButton.css'

export type Command = 'start' | 'proceed' | 'stop' | 'pause' | 'resume' | 'enable' | 'disable'

export interface Control {
  title: string
  command: Command
  onRequest: boolean
  execute: (command: string, taskFlowId: number) => void
}

interface TaskFlowControlButtonProps {
  taskFlowId: number
  isTaskFlowActive: boolean
  isTaskFlowUsing: boolean
  taskFlowRunningStatus: TaskFlowRunningStatus
  control: Control
}

const TaskFlowControlButton = ({
  taskFlowId,
  isTaskFlowActive,
  isTaskFlowUsing,
  taskFlowRunningStatus,
  control
}: TaskFlowControlButtonProps) => {
  let enabled = isTaskFlowActive && isTaskFlowUsing
  let display = true

  // stopPropagation 하지 않는다: 클릭이 행(TaskFlowItem)까지 올라가야 제어를 요청한
  // taskflow 가 목록에서 선택되고 아래 캔버스도 그 taskflow 로 바뀐다(= 제어 대상에 포커스).
  function onControlClick() {
    console.log('control clicked')
    // 비활성 상태에서도 클릭 자체는 받는다(행 선택은 되어야 하므로). 제어 요청만 건너뛴다.
    if (!enabled) return
    control.execute(control.command, taskFlowId)
  }
  enabled = control.onRequest
  switch (control.command) {
    case 'start':
      enabled = enabled && taskFlowRunningStatus !== 'PAUSED' && taskFlowRunningStatus !== 'RUNNING'
      break
    case 'proceed':
      enabled = enabled && taskFlowRunningStatus === 'WAITING'
      break
    case 'pause':
      enabled = enabled && taskFlowRunningStatus === 'RUNNING'
      break
    case 'resume':
      enabled = enabled && taskFlowRunningStatus === 'PAUSED'
      break
    case 'stop':
      enabled = enabled && (taskFlowRunningStatus === 'PAUSED' || taskFlowRunningStatus === 'RUNNING')
      break
    case 'enable':
      enabled = isTaskFlowActive
      display = !isTaskFlowUsing
      break
    case 'disable':
      enabled = isTaskFlowActive
      display = isTaskFlowUsing
      break
  }

  return (
    <>
      {display && (
        <button
          className={`control-button ${enabled ? 'enabled' : 'disabled'}`}
          style={{
            marginLeft: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 36,
            padding: '0 16px',
            fontSize: 14,
            fontWeight: 600,
            color: '#4b5563',
            border: '1px solid #C0C7D0',
            borderRadius: 6,
            cursor: enabled ? 'pointer' : 'not-allowed',
            opacity: enabled ? 1 : 0.4
          }}
          // disabled 속성을 쓰면 브라우저가 클릭 이벤트를 아예 만들지 않아 행 선택도 막힌다.
          // 그래서 aria-disabled 로만 표시하고 실행 여부는 onControlClick 에서 가른다.
          aria-disabled={!enabled}
          onClick={onControlClick}
        >
          {control.title}
        </button>
      )}
    </>
  )
}

export default TaskFlowControlButton
