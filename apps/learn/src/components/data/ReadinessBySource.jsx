import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { SOURCE_COLOR_MAP } from '../../styles/theme'

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const StatCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 10px;
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
`

const SourceName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  min-width: 120px;
`

const Stats = styled.div`
  display: flex;
  gap: 24px;
`

const StatItem = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--color-secondary-90, #262f44)'};
`

const StatLabel = styled.div`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
  margin-top: 2px;
`

const MOCK_STATS = [
  { id: 'tms', total: 234, accepted: 180, pending: 34, rejected: 20 },
  { id: 'teleop', total: 1200 },
  { id: 'watch', total: 89, motions: 512 },
  { id: 'simulation', total: 3400 },
  { id: 'upload', total: 800 }
]

export default function ReadinessBySource({ stats }) {
  const { t } = useTranslation('learn')
  const data = stats || MOCK_STATS

  return (
    <Grid>
      {data.map((item) => {
        const color = SOURCE_COLOR_MAP[item.id] || '#868E96'
        return (
          <StatCard key={item.id} $color={color}>
            <SourceName>{t(`readinessBySource.sourceNames.${item.id}`, { defaultValue: item.id })}</SourceName>
            <Stats>
              <StatItem>
                <StatValue $color={color}>{item.total.toLocaleString()}</StatValue>
                <StatLabel>{t('readinessBySource.statLabels.total')}</StatLabel>
              </StatItem>
              {item.accepted !== undefined && (
                <StatItem>
                  <StatValue $color="#51CF66">{item.accepted}</StatValue>
                  <StatLabel>{t('readinessBySource.statLabels.accepted')}</StatLabel>
                </StatItem>
              )}
              {item.pending !== undefined && (
                <StatItem>
                  <StatValue $color="#FCC419">{item.pending}</StatValue>
                  <StatLabel>{t('readinessBySource.statLabels.pending')}</StatLabel>
                </StatItem>
              )}
              {item.rejected !== undefined && (
                <StatItem>
                  <StatValue $color="#FF6B6B">{item.rejected}</StatValue>
                  <StatLabel>{t('readinessBySource.statLabels.rejected')}</StatLabel>
                </StatItem>
              )}
              {item.motions !== undefined && (
                <StatItem>
                  <StatValue>{item.motions}</StatValue>
                  <StatLabel>{t('readinessBySource.statLabels.motions')}</StatLabel>
                </StatItem>
              )}
            </Stats>
          </StatCard>
        )
      })}
    </Grid>
  )
}
