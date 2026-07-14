import { Control } from './TaskFlowControlButton'
import TaskFlowItem from './TaskFlowItem'
import { RobotTaskFlow } from '@/types/api/device'

interface TaskFlowListProps {
  taskFlowList: RobotTaskFlow[]
  controlList: Control[]
  settingList: [Control[]]
  selectedId: number
  onListClick: (id: number) => void
}
const TaskFlowList = ({ taskFlowList, controlList, settingList, selectedId, onListClick }: TaskFlowListProps) => {
  return (
    <div
      style={{
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}
    >
      {taskFlowList.map((taskFlow) => (
        <TaskFlowItem
          taskFlow={taskFlow}
          controlList={controlList}
          settingList={settingList}
          selectedId={selectedId}
          onListClicked={onListClick}
        />
      ))}
    </div>
  )
}

export default TaskFlowList
