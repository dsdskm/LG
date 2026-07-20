import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StatusBadge from '../components/common/StatusBadge'
import { getModels, updateModelStatus } from '../services/forgeApi'
import { openForge } from '../services/forgeApi'
import dayjs from 'dayjs'

const Page = styled.div`
  padding: 32px;
`

const PageTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const PageSub = styled.p`
  margin: 0 0 28px 0;
  font-size: 14px;
  color: var(--color-secondary-50, #848c9d);
`

const ModelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ModelCard = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const ModelInfo = styled.div`
  flex: 1;
`

const ModelName = styled.h3`
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const ModelMeta = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`

const MetaItem = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);

  span {
    color: var(--color-secondary-70, #555e72);
    font-weight: 500;
    margin-left: 4px;
  }
`

const ScoreBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-neutral-30, #f5f5f5);
  border-radius: 8px;
`

const ScoreLabel = styled.span`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
  min-width: 120px;
`

const ScoreBarInner = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--color-secondary-20, #dadde2);
  overflow: hidden;
`

const ScoreFill = styled.div`
  height: 100%;
  border-radius: 4px;
  width: ${({ $value }) => $value * 100}%;
  background: ${({ $value }) => ($value >= 0.85 ? '#51CF66' : $value >= 0.7 ? '#FCC419' : '#FF6B6B')};
`

const ScoreValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $value }) => ($value >= 0.85 ? '#51CF66' : $value >= 0.7 ? '#FCC419' : '#FF6B6B')};
  min-width: 40px;
  text-align: right;
`

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`

const ActionBtn = styled.button`
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: ${({ $variant }) =>
    $variant === 'approve'
      ? '#51CF66'
      : $variant === 'reject'
        ? '#FF6B6B'
        : $variant === 'retrain'
          ? '#FCC419'
          : 'var(--color-secondary-20, #dadde2)'};
  color: ${({ $variant }) =>
    $variant === 'retrain' ? '#000' : $variant ? '#fff' : 'var(--color-secondary-90, #262f44)'};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};

  &:hover {
    opacity: 0.85;
  }
`

const SimBtn = styled.button`
  padding: 9px 18px;
  border: 1px solid #4a90d9;
  border-radius: 8px;
  background: transparent;
  color: #4a90d9;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: rgba(74, 144, 217, 0.1);
  }
`

const Empty = styled.div`
  padding: 60px;
  text-align: center;
  color: var(--color-secondary-50, #848c9d);
  font-size: 14px;
`

export default function ReviewApprovalPage() {
  const { t } = useTranslation('learn')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getModels()
      .then(setModels)
      .finally(() => setLoading(false))
  }, [])

  const handleAction = async (modelId, action) => {
    await updateModelStatus(modelId, action)
    setModels((m) => m.map((model) => (model.id === modelId ? { ...model, status: action } : model)))
  }

  if (loading) {
    return (
      <Page>
        <Empty>{t('review.loading')}</Empty>
      </Page>
    )
  }

  return (
    <Page>
      <PageTitle>{t('review.title')}</PageTitle>
      <PageSub>{t('review.subtitle')}</PageSub>

      {models.length === 0 ? (
        <Empty>{t('review.empty')}</Empty>
      ) : (
        <ModelList>
          {models.map((model) => (
            <ModelCard key={model.id}>
              <CardTop>
                <ModelInfo>
                  <ModelName>{model.name}</ModelName>
                  <ModelMeta>
                    <MetaItem>
                      {t('review.baseModel')}:<span>{model.baseModel}</span>
                    </MetaItem>
                    <MetaItem>
                      {t('review.createdAt')}:<span>{dayjs(model.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                    </MetaItem>
                  </ModelMeta>
                </ModelInfo>
                <StatusBadge status={model.status} />
              </CardTop>

              <ScoreBar>
                <ScoreLabel>Validation Score</ScoreLabel>
                <ScoreBarInner>
                  <ScoreFill $value={model.validationScore} />
                </ScoreBarInner>
                <ScoreValue $value={model.validationScore}>{(model.validationScore * 100).toFixed(0)}%</ScoreValue>
              </ScoreBar>

              <Actions>
                <ActionBtn
                  $variant="approve"
                  $disabled={model.status === 'approved'}
                  onClick={() => handleAction(model.id, 'approved')}
                >
                  {t('review.approve')}
                </ActionBtn>
                <ActionBtn
                  $variant="reject"
                  $disabled={model.status === 'rejected'}
                  onClick={() => handleAction(model.id, 'rejected')}
                >
                  {t('review.reject')}
                </ActionBtn>
                <ActionBtn $variant="retrain" onClick={() => handleAction(model.id, 'retrain-requested')}>
                  {t('review.retrain')}
                </ActionBtn>
                <SimBtn onClick={() => openForge(`/model-simulation/${model.id}`)}>{t('review.viewSimulation')}</SimBtn>
              </Actions>
            </ModelCard>
          ))}
        </ModelList>
      )}
    </Page>
  )
}
