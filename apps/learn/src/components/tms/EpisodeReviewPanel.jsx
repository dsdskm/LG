import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StatusBadge from '../common/StatusBadge'

const Panel = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
`

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-secondary-50, #848c9d);
  font-size: 14px;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const EpTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const VideoPreview = styled.div`
  background: #000;
  border-radius: 8px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary-50, #848c9d);
  font-size: 13px;
`

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const MetaLabel = styled.span`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const MetaValue = styled.span`
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
  font-weight: 500;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--color-secondary-20, #dadde2);
`

const ActionBtn = styled.button`
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ $variant }) => ($variant === 'accept' ? '#51CF66' : $variant === 'pending' ? '#FCC419' : '#FF6B6B')};
  color: #fff;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.9;
  }
`

export default function EpisodeReviewPanel({ episode, reviewStatus, onReview }) {
  const { t } = useTranslation('learn')

  if (!episode) {
    return (
      <Panel>
        <Empty>{t('episodeReviewPanel.empty')}</Empty>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHeader>
        <EpTitle>{episode.id}</EpTitle>
        <StatusBadge status={episode.status} />
      </PanelHeader>

      <VideoPreview>{t('episodeReviewPanel.videoPreview')}</VideoPreview>

      <MetaGrid>
        <MetaItem>
          <MetaLabel>Step</MetaLabel>
          <MetaValue>{episode.step}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>{t('episodeReviewPanel.durationLabel')}</MetaLabel>
          <MetaValue>{episode.duration}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>{t('episodeReviewPanel.interventionLabel')}</MetaLabel>
          <MetaValue>{episode.hasIntervention ? t('episodeReviewPanel.interventionYes') : t('episodeReviewPanel.interventionNo')}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>{t('episodeReviewPanel.reviewStatusLabel')}</MetaLabel>
          <MetaValue>{reviewStatus || t('episodeReviewPanel.notReviewed')}</MetaValue>
        </MetaItem>
      </MetaGrid>

      <Actions>
        <ActionBtn
          $variant="accept"
          $active={reviewStatus === 'accepted'}
          onClick={() => onReview(episode.id, 'accepted')}
        >
          {t('episodeReviewPanel.acceptBtn')}
        </ActionBtn>
        <ActionBtn
          $variant="pending"
          $active={reviewStatus === 'pending'}
          onClick={() => onReview(episode.id, 'pending')}
        >
          {t('episodeReviewPanel.pendingBtn')}
        </ActionBtn>
        <ActionBtn
          $variant="reject"
          $active={reviewStatus === 'rejected'}
          onClick={() => onReview(episode.id, 'rejected')}
        >
          {t('episodeReviewPanel.rejectBtn')}
        </ActionBtn>
      </Actions>
    </Panel>
  )
}
