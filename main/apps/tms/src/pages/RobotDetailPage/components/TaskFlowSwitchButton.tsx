import { SegmentedWrap } from '@/pages/TaskFlowCanvasPage/FlowCanvasViewer/styles'
import { Control } from './TaskFlowControlButton'
import { TaskFlowRunningStatus } from '@/types/RobotInfo'
import { MediumSegmentedButton } from '../styles'

interface TaskFlowSwitchButtonProps {
  taskFlowId: number
  isTaskFlowActive: boolean
  isTaskFlowUsing: boolean
  taskFlowRunningStatus: TaskFlowRunningStatus
  controls: Control[]
}

const TaskFlowSwitchButton = ({
  taskFlowId,
  isTaskFlowActive,
  isTaskFlowUsing,
  controls
}: TaskFlowSwitchButtonProps) => {
  console.log('final settings ', controls)
  return (
    <>
      <SegmentedWrap>
        <MediumSegmentedButton
          type="button"
          $active={isTaskFlowUsing && isTaskFlowActive}
          $first
          onClick={(e) => {
            e.stopPropagation()
            controls[0].execute(controls[0].command, taskFlowId)
          }}
        >
          {controls[0].title}
        </MediumSegmentedButton>
        <MediumSegmentedButton
          type="button"
          $active={!isTaskFlowUsing && isTaskFlowActive}
          $last
          onClick={(e) => {
            e.stopPropagation()
            controls[1].execute(controls[1].command, taskFlowId)
          }}
        >
          {controls[1].title}
        </MediumSegmentedButton>
      </SegmentedWrap>
    </>
  )
}

export default TaskFlowSwitchButton
