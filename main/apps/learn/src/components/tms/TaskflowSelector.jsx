import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { getTaskflows } from '../../services/tmsApi'
import OrgSelector from './OrgSelector'

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
`

const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => ($selected ? '#4A90D9' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(74,144,217,0.08)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #4a90d9;
  }
`

const ItemInfo = styled.div``

const ItemName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 4px;
`

const ItemMeta = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const ItemRight = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const TaskHeader = styled.div`
  padding: 10px 14px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(47, 146, 159, 0.07);
  border: 1px solid rgba(47, 146, 159, 0.2);
  font-size: 13px;
  color: var(--color-primary-60, #2f929f);
  font-weight: 600;
`

const Empty = styled.div`
  padding: 32px;
  text-align: center;
  color: var(--color-secondary-50, #848c9d);
  font-size: 13px;
`

const Loading = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-secondary-50, #848c9d);
`

export default function TaskflowSelector({ selected, onSelect, suggestedTask }) {
  const { t } = useTranslation('learn')
  const [org, setOrg] = useState({ groupId: null, siteId: null })
  const [taskflows, setTaskflows] = useState([])
  const [loading, setLoading] = useState(false)

  const orgReady = !!(org.groupId && org.siteId)

  useEffect(() => {
    if (!orgReady) return
    setLoading(true)
    getTaskflows(org.groupId, org.siteId)
      .then(setTaskflows)
      .finally(() => setLoading(false))
  }, [org.groupId, org.siteId, orgReady])

  const visible = suggestedTask ? taskflows.filter((tf) => tf.name === suggestedTask) : taskflows

  return (
    <>
      <OrgSelector value={org} onChange={setOrg} />

      {!orgReady ? (
        <Empty>{t('orgSelector.hint')}</Empty>
      ) : loading ? (
        <Loading>{t('taskflowSelector.loading')}</Loading>
      ) : (
        <>
          {suggestedTask && <TaskHeader>{t('taskflowSelector.taskHeader', { task: suggestedTask })}</TaskHeader>}
          <List>
            {visible.length === 0 ? (
              <Empty>{t('taskflowSelector.empty', { task: suggestedTask })}</Empty>
            ) : (
              visible.map((tf) => (
                <Item key={tf.id} $selected={selected?.id === tf.id} onClick={() => onSelect(tf)}>
                  <ItemInfo>
                    <ItemName>{tf.name}</ItemName>
                    <ItemMeta>
                      {tf.description} · {t('taskflowSelector.itemMeta', { count: tf.stepCount })}
                    </ItemMeta>
                  </ItemInfo>
                  <ItemRight>{t('taskflowSelector.lastRun', { date: tf.lastRun })}</ItemRight>
                </Item>
              ))
            )}
          </List>
        </>
      )}
    </>
  )
}
