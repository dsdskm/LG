import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StatusBadge from '../common/StatusBadge'

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-secondary-50, #848c9d);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const Tr = styled.tr`
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const Td = styled.td`
  padding: 14px 16px;
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const Count = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const STATUS_KEYS = {
  completed: 'completed',
  running: 'running',
  failed: 'failed'
}

const MOCK_DATA = [
  { task: '자제 팔레타이징', episodes: 320, statusKey: 'completed', minRequired: 200 },
  { task: 'Pick & Place', episodes: 1800, statusKey: 'completed', minRequired: 500 },
  { task: '재고 검수 분류', episodes: 45, statusKey: 'failed', minRequired: 200 },
  { task: '제조 PoC', episodes: 120, statusKey: 'running', minRequired: 300 }
]

export default function ReadinessByTask({ stats }) {
  const { t } = useTranslation('learn')
  const data = stats || MOCK_DATA

  return (
    <Table>
      <thead>
        <tr>
          <Th>{t('readinessByTask.headers.task')}</Th>
          <Th>{t('readinessByTask.headers.episodes')}</Th>
          <Th>{t('readinessByTask.headers.minRequired')}</Th>
          <Th>{t('readinessByTask.headers.status')}</Th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => {
          const statusKey = item.statusKey || STATUS_KEYS[item.status] || 'queued'
          return (
            <Tr key={item.task}>
              <Td>{item.task}</Td>
              <Td>
                <Count>{item.episodes.toLocaleString()}</Count>
              </Td>
              <Td style={{ color: 'var(--color-secondary-50, #848c9d)' }}>{item.minRequired.toLocaleString()}</Td>
              <Td>
                <StatusBadge status={statusKey} label={t(`readinessByTask.statusLabels.${statusKey}`, { defaultValue: statusKey })} />
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
