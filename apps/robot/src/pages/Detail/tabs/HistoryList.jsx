import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { Table, SectionRobot as Section } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { toYmdHmKST } from '@/utils/dateUtils'
import { userApis, deviceApis } from '@/apis'

const HistoryList = ({ t, deviceId }) => {
  const { t: tCommon } = useTranslation('common')
  const [historys, setHistorys] = useState([])
  const [filteredList, setFilteredList] = useState([])
  const [userMap, setUserMap] = useState({})

  // userId -> userEmail 맵 미리 구성
  const loadUserList = useCallback(async () => {
    try {
      const data = await userApis.getUsers({})
      const map = {}
      ;(data.content || []).forEach((u) => {
        map[u.userId] = u.userEmail
      })
      setUserMap(map)
    } catch (err) {
      console.error('Error loadUsers:', err)
    }
  }, [])

  const loadHistoryList = useCallback(
    async (searchParams = {}) => {
      setHistorys([])
      try {
        const data = await deviceApis.getDeviceControlHistory(deviceId, searchParams)
        setHistorys(data.content)
        setTableList(data.content)
      } catch (err) {
        console.error('Error loadGetDeviceControlHistory:', err)
      } finally {
      }
    },
    [deviceId]
  )

  function setTableList(tList) {
    let loopList = []
    for (var i = 0; i < tList.length; i++) {
      loopList.push(tList[i])
    }

    setFilteredList(loopList)
  }

  useEffect(() => {
    loadUserList()
  }, [loadUserList])

  useEffect(() => {
    loadHistoryList()
  }, [deviceId])

  // controlCommand(JSON 문자열)에서 actionType 추출
  const getActionType = (controlCommandStr) => {
    try {
      const cmd = JSON.parse(controlCommandStr)
      const action = (cmd.actions && cmd.actions[0]) || (cmd.instantActions && cmd.instantActions[0])
      return action?.actionType ?? '-'
    } catch (err) {
      return '-'
    }
  }

  // controlResult 값에 따른 상태 표시
  const getState = (controlResult) => {
    if (controlResult === null) return t('normal') /* '일반' */
    if (controlResult === 'saveOnly') return t('saveOnly') /* '저장 전용' */
    return controlResult
  }

  const columns = useMemo(
    () => [
      {
        name: t('user'),
        selector: (row) => userMap[row.userId] || t('unconfirmed'),
        sortable: true
      },
      {
        name: t('contorlEntryPath'),
        selector: (row) => getActionType(row.controlCommand),
        sortable: true
      },
      {
        name: t('startEndtime'),
        selector: (row) => toYmdHmKST(row.createdAt),
        sortable: true
      },
      {
        name: t('state'),
        selector: (row) => getState(row.controlResult),
        sortable: true
      }
    ],
    [t, userMap]
  )

  return (
    <>
      <Section>
        <Table
          columns={columns}
          data={historys}
          noData={tCommon('noData')}
          pagination
          paginationRowsPerPageOptions={[10, 30, 50, 100]}
        />
      </Section>
    </>
  )
}

export default HistoryList
