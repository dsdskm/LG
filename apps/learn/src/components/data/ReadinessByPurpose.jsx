import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PurposeName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
`

const Percent = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $value }) => ($value >= 80 ? '#51CF66' : $value >= 50 ? '#FCC419' : '#FF6B6B')};
`

const ProgressBar = styled.div`
  height: 8px;
  border-radius: 4px;
  background: var(--color-secondary-20, #dadde2);
  overflow: hidden;
`

const Progress = styled.div`
  height: 100%;
  border-radius: 4px;
  width: ${({ $value }) => $value}%;
  background: ${({ $value }) => ($value >= 80 ? '#51CF66' : $value >= 50 ? '#FCC419' : '#FF6B6B')};
  transition: width 0.6s ease;
`

const BasedOn = styled.span`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
`

const MOCK_DATA = [
  { id: 'pre-training', percent: 78 },
  { id: 'post-training', percent: 62 },
  { id: 'in-field', percent: 28 },
  { id: 'failure-model', percent: 15 }
]

export default function ReadinessByPurpose({ stats }) {
  const { t } = useTranslation('learn')
  const data = stats || MOCK_DATA

  return (
    <Grid>
      {data.map((item) => (
        <Row key={item.id}>
          <RowHeader>
            <PurposeName>{t(`readinessByPurpose.items.${item.id}.name`, { defaultValue: item.id })}</PurposeName>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BasedOn>{t(`readinessByPurpose.items.${item.id}.basedOn`, { defaultValue: '' })}</BasedOn>
              <Percent $value={item.percent}>{item.percent}%</Percent>
            </div>
          </RowHeader>
          <ProgressBar>
            <Progress $value={item.percent} />
          </ProgressBar>
        </Row>
      ))}
    </Grid>
  )
}
