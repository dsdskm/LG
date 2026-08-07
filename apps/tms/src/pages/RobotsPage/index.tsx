import { RobotInfo, TaskFlowRunningStatus } from '@/types/RobotInfo'
import { OrganizationSelector } from '@repo/ui'
import { SearchContainer } from '@repo/ui'
import { Section } from '@repo/ui'
import { Search } from '@repo/ui'
import { Dropdown } from '@repo/ui'
import { Title } from '@repo/ui'
import { StyledPageContent } from '@repo/ui'
import RobotList from '@/pages/components/robot/RobotList'
import { toRobotInfo } from '@/pages/components/robot/toRobotInfo'
import { useMemo, useState } from 'react'
import { useDeviceList } from '@/api/deviceApis'
import { DeviceParams } from '@/types/api/device'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SimpleRobotInfo } from '@/types/taskflow'

const taskFlowOptions = [{ value: 'all', name: 'all' }]

const taskFlowStatusOptions = [
  { value: 'all', name: 'all' },
  { value: 'READY', name: 'ready' },
  { value: 'RUNNING', name: 'running' },
  { value: 'PAUSED', name: 'paused' },
  { value: 'CANCELED', name: 'canceled' },
  { value: 'STOPPED', name: 'stopped' },
  { value: 'FAILURE', name: 'failure' },
  { value: 'SUCCESS', name: 'success' }
]

const RobotsPage = () => {
  const { t } = useTranslation('tms')
  const navigate = useNavigate()
  const [selectedRobotIds, setSelectedRobotId] = useState<SimpleRobotInfo[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [firstFilter, setFirstFlilter] = useState('all')
  const [secondFilter, setSecondFlilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupSite, setGroupSite] = useState({ value: ['all', 'all'] })
  const [deviceParams, setDeviceParams] = useState<DeviceParams | undefined>(undefined)

  const { data: devicesData, error: devicesError, isLoading: devicesLoading } = useDeviceList(deviceParams)
  const robotList: RobotInfo[] = useMemo(() => {
    const targetRobots = devicesData?.content ?? []
    const robots = targetRobots.map((device) => {
      const taskFlowState = device.tms?.taskFlowState
      const runningTaskFlowId = taskFlowState?.runningTaskFlowStatus?.taskFlowId
      const runningTaskFlow = taskFlowState?.taskFlows?.find((tf) => tf.id === runningTaskFlowId)

      taskFlowState?.taskFlows?.forEach((tf) => {
        if (!taskFlowOptions.some((tfo) => tfo.name === tf.name)) {
          taskFlowOptions.push({ name: tf.name, value: tf.name })
        }
      })

      return {
        ...toRobotInfo(device),
        installedTaskFlowCount: taskFlowState?.taskFlows?.length ?? 0,
        runningTaskFlowId,
        runningTaskFlowName: runningTaskFlow?.name,
        runningTaskFlowStatus: runningTaskFlow?.operationStatus as TaskFlowRunningStatus
      }
    })

    const filtered = robots.filter((robot) => {
      const [group, site] = groupSite.value
      if (group == 'none' && robot.group !== '') {
        return false
      }
      if (site == 'none' && robot.site !== '') {
        return false
      }
      if (firstFilter !== 'all' && robot.runningTaskFlowName !== firstFilter) {
        return false
      }
      if (secondFilter !== 'all' && robot.runningTaskFlowStatus !== secondFilter) {
        return false
      }
      return true
    })

    return filtered.sort((a, b) => {
      const groupA = a.group ?? ''
      const groupB = b.group ?? ''
      const groupCompare = groupA.localeCompare(groupB, 'ko')

      if (groupCompare !== 0) return groupCompare

      const siteA = a.site ?? ''
      const siteB = b.site ?? ''
      const siteCompare = siteA.localeCompare(siteB, 'ko')

      if (siteCompare !== 0) return siteCompare

      return (a.name ?? '').localeCompare(b.name ?? '', 'ko')
    })
  }, [devicesData, firstFilter, secondFilter, groupSite])

  if (devicesLoading) return <p>Loading...</p>
  if (devicesError) return <p>error: {devicesError.message}</p>

  console.log('data = ', devicesData)
  /* 
  const toggleRobotSelection = (robotId: string) => {
    const item = robotList.find((i) => i.id === robotId)
    if (!item) return
    setSelectedRobotId((prev) => (prev.includes(robotId) ? prev.filter((id) => id !== robotId) : [...prev, robotId]))
  }
 
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRobotId([])
    } else {
      setSelectedRobotId(robotList.map((item) => item.id))
    }
    setSelectAll(!selectAll)
  }
*/
  const onSearchQueryChaged = (e: any) => {
    setSearchQuery(e.target.value)
  }

  const resetSearchQuery = () => {
    setSearchQuery('')
  }

  const onOrgChanged = (e: any) => {
    setGroupSite({ value: e.values })
    const [group, site] = e.values

    console.log('org info', e.values)

    let nextParams: DeviceParams | undefined = undefined

    if (group !== 'all' || site !== 'all') {
      nextParams = {}
    }

    if (group !== 'all' && group !== 'none') {
      nextParams = {
        ...nextParams,
        groupId: [group]
      }
    }

    if (site !== 'all' && site !== 'none') {
      nextParams = {
        ...nextParams,
        siteId: [site]
      }
    }

    setDeviceParams(nextParams)
    console.log('nextParams = ', nextParams)
  }

  const onTaskFlowStatusChaged = (value: string) => {
    setSecondFlilter(value)
  }

  return (
    <>
      <StyledPageContent className="column">
        <Title>{t('robots.title')}</Title>
        <OrganizationSelector onChange={onOrgChanged} supportAlls={[true, true]} supportNone={[true, true]} />
        <Section>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              margin: '0 0 12px 0',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              {/* <input
                type="checkbox"
                style={{ height: '16px', width: '16px', cursor: 'pointer' }}
                checked={selectAll}
                onChange={handleSelectAll}
              />
              <label
                style={{ fontSize: '14px', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', marginLeft: '8px' }}
              >
                전체 선택
              </label> */}
              <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                {/* <Dropdown
                  size="lg"
                  minWidth="180px"
                  placeholder="최근 실행 TaskFlow"
                  defaultValue={t('robots.statusFilter')}
                  options={taskFlowOptions}
                  onChange={() => {}}
                /> */}
                <Dropdown
                  size="lg"
                  minWidth="180px"
                  placeholder="TaskFlow 상태"
                  defaultValue={t('robots.taskflowFilter')}
                  options={taskFlowStatusOptions}
                  onChange={onTaskFlowStatusChaged}
                />

                <SearchContainer>
                  <Search
                    value={searchQuery}
                    onChange={onSearchQueryChaged}
                    onReset={resetSearchQuery}
                    placeholder={t('deploy.searchRobot')}
                  />
                </SearchContainer>
              </div>
            </div>

            {/* <div style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
              <Button onClick={() => {}}>실행</Button>
              <Button onClick={() => {}}>정지</Button>
            </div> */}
          </div>

          <RobotList
            mode="CONTROL"
            robotList={robotList}
            searchQuery={searchQuery}
            selectedRobotIds={selectedRobotIds}
            onClickItem={(robotId) => navigate(`/tms/robots/${robotId}/detail`)}
          />
        </Section>
      </StyledPageContent>
    </>
  )
}

export default RobotsPage
