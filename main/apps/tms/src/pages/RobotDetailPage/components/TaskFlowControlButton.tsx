import { TaskFlowRunningStatus } from '@/types/RobotInfo'
import './TaskFlowControlButton.css'

export type Command = 'start' | 'stop' | 'pause' | 'resume' | 'enable' | 'disable'

export interface Control {
  title: string
  command: Command
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

  function onControlClick(event: React.MouseEvent<HTMLButtonElement>) {
    console.log('control clicked')
    event.stopPropagation()
    control.execute(control.command, taskFlowId)
  }

  switch (control.command) {
    case 'start':
      enabled = enabled && taskFlowRunningStatus === 'READY'
      break
    case 'pause':
      enabled = enabled && taskFlowRunningStatus === 'RUNNING'
      break
    case 'resume':
      enabled = enabled && taskFlowRunningStatus === 'PAUSED'
      break
    case 'stop':
      enabled = enabled && taskFlowRunningStatus !== 'READY'
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
          disabled={!enabled}
          onClick={onControlClick}
        >
          {control.title}
        </button>
      )}
    </>
  )
}

export default TaskFlowControlButton
