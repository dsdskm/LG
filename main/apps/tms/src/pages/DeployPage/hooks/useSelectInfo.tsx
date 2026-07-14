import { RobotInfo } from '@/types/RobotInfo'
import { SimpleRobotInfo } from '@/types/taskflow'
import { useState } from 'react'

function useSelectInfo() {
  const [selectedRobotList, setSelectedRobotList] = useState<SimpleRobotInfo[]>([])
  const [robotSearchQuery, setRobotSearchQuery] = useState('')
  const [selectAll, setSelectAll] = useState(false)

  const [deployStatusFilter, setDeployStatusFilter] = useState('all')
  const [operationStatusFilter, setOperationStatusFilter] = useState('all')

  const onSelectedRobotChanged = (robotInfo: RobotInfo | RobotInfo[]) => {
    if (Array.isArray(robotInfo)) {
      setSelectedRobotList(
        robotInfo.map((robot) => {
          return { id: robot.id, groupId: robot.groupId, siteId: robot.siteId }
        })
      )
      return
    }
    const { id, groupId, siteId } = robotInfo
    setSelectedRobotList((prev) => {
      const exists = prev.some((r) => r.id === id && r.groupId === groupId && r.siteId === siteId)

      if (exists) {
        return prev.filter((r) => !(r.id === id && r.groupId === groupId && r.siteId === siteId))
      }

      return [...prev, { id, groupId: groupId, siteId: siteId }]
    })
  }

  const onRobotSearchQueryChanged = (query: string) => {
    setRobotSearchQuery(query)
  }
  const onSelectAllChanged = (isSelectedAll: boolean) => {
    setSelectAll(isSelectedAll)
  }

  return {
    selectedRobotList,
    onSelectedRobotChanged,
    robotSearchQuery,
    onRobotSearchQueryChanged,
    selectAll,
    onSelectAllChanged,
    deployStatusFilter,
    setDeployStatusFilter,
    operationStatusFilter,
    setOperationStatusFilter
  }
}

export default useSelectInfo
