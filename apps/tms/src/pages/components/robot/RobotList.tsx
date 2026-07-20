import { SimpleRobotInfo } from '@/types/taskflow'
import type { RobotInfo } from '../../../types/RobotInfo'
import RobotItem from './RobotItem'

export type UnselectableRobot = {
  robotId: string
  reason: string
}

export type DeployInfo = {
  date: string
  status: 'IN_PROGRESS'
  robotsStatus: RobotDeployStatus[]
}

export type RobotDeployStatus = {
  robotId: string
  deployStatus: 'SUCCESS' | 'QUEUED'
}

type RobotListProps = {
  robotList: RobotInfo[]
  searchQuery: string
  selectedRobotIds: SimpleRobotInfo[]
  mode: 'DEPLOY' | 'CONTROL'
  onChangeCheckbox?: (robot: RobotInfo) => void
  onClickItem?: (robotId: string) => void
}

const RobotList = ({
  mode,
  robotList,
  searchQuery,
  selectedRobotIds,
  onChangeCheckbox,
  onClickItem
}: RobotListProps) => {
  console.log('robotList robotList', robotList)
  return (
    <>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {robotList
          .filter((robot) => robot.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((robot) => {
            const robotStatus = robot?.deployStatus
            console.log('robot deploy status = ', robotStatus)
            return (
              <RobotItem
                key={robot.id}
                robot={robot}
                isDisabled={robot.deployable?.deployable === false}
                disabledReason={robot.deployable?.reason ?? ''}
                checked={selectedRobotIds.some((robotInfo) => robotInfo.id === robot.id)}
                onChangeCheckbox={onChangeCheckbox}
                onClick={onClickItem}
                displaySpec={mode === 'DEPLOY'}
                displayTaskFlow={mode === 'CONTROL'}
                deployStatus={robotStatus}
              />
            )
          })}
      </div>
    </>
  )
}

export default RobotList
