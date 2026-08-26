import { SimpleRobotInfo } from '@/types/taskflow'
import type { RobotInfo, SkillType } from '../../../types/RobotInfo'
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
  necessarySkills?: SkillType[]
  mode: 'DEPLOY' | 'CONTROL'
  onChangeCheckbox?: (robot: RobotInfo) => void
  onClickItem?: (robot: RobotInfo) => void
  onClickControlItem?: (robotId: string) => void
  showControlButton?: boolean
}

const RobotList = ({
  mode,
  robotList,
  searchQuery,
  selectedRobotIds,
  necessarySkills,
  onChangeCheckbox,
  onClickItem,
  onClickControlItem,
  showControlButton = false
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
                onClickControl={onClickControlItem}
                displaySpec={mode === 'DEPLOY'}
                necessarySkills={necessarySkills}
                displayTaskFlow={mode === 'CONTROL'}
                deployStatus={robotStatus}
                showControlButton={showControlButton}
              />
            )
          })}
      </div>
    </>
  )
}

export default RobotList
