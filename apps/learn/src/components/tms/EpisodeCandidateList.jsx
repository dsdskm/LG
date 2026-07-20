import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StatusBadge from '../common/StatusBadge'

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 500px;
`

const Item = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $selected }) => ($selected ? '#4A90D9' : 'transparent')};
  background: ${({ $selected }) => ($selected ? 'rgba(74,144,217,0.08)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ $selected }) => ($selected ? 'rgba(74,144,217,0.1)' : 'rgba(255,255,255,0.03)')};
  }
`

const ItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const EpId = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  min-width: 60px;
`

const StepLabel = styled.span`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const ReviewBadge = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'accepted'
      ? '#51CF6622'
      : $status === 'rejected'
        ? '#FF6B6B22'
        : $status === 'pending'
          ? '#FCC41922'
          : 'transparent'};
  color: ${({ $status }) =>
    $status === 'accepted'
      ? '#51CF66'
      : $status === 'rejected'
        ? '#FF6B6B'
        : $status === 'pending'
          ? '#FCC419'
          : 'var(--color-secondary-50, #848c9d)'};
`

export default function EpisodeCandidateList({ episodes, reviewMap, selectedId, onSelect, filters }) {
  const { t } = useTranslation('learn')
  const filtered = episodes.filter((ep) => {
    if (filters?.step && ep.step !== filters.step) return false
    if (filters?.status && ep.status !== filters.status) return false
    if (filters?.hasIntervention && !ep.hasIntervention) return false
    return true
  })

  return (
    <List>
      {filtered.map((ep) => {
        const reviewStatus = reviewMap[ep.id]
        return (
          <Item key={ep.id} $selected={selectedId === ep.id} onClick={() => onSelect(ep)}>
            <ItemLeft>
              <EpId>{ep.id}</EpId>
              <StatusBadge status={ep.status} />
              <StepLabel>{ep.step}</StepLabel>
            </ItemLeft>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {ep.hasIntervention && <span style={{ fontSize: 11, color: '#FCC419' }}>{t('episodeCandidateList.interventionTag')}</span>}
              {reviewStatus && <ReviewBadge $status={reviewStatus}>{t(`episodeCandidateList.reviewLabels.${reviewStatus}`)}</ReviewBadge>}
            </div>
          </Item>
        )
      })}
    </List>
  )
}
