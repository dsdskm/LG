import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StatusBadge from '../components/common/StatusBadge'
import { useTrainingJobs } from '../hooks/useForgeApi'
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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const RefreshBtn = styled.button`
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 8px;
  color: var(--color-secondary-50, #848c9d);
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: #4a90d9;
    color: var(--color-secondary-90, #262f44);
  }
`

const JobList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const JobCard = styled.div`
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 12px;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;
`

const JobLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const JobName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const JobMeta = styled.div`
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

const ProgressWrapper = styled.div`
  margin-top: 4px;
`

const ProgressBar = styled.div`
  height: 6px;
  border-radius: 3px;
  background: var(--color-secondary-20, #dadde2);
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 3px;
  width: ${({ $value }) => $value}%;
  background: ${({ $status }) => ($status === 'completed' ? '#51CF66' : $status === 'failed' ? '#FF6B6B' : '#4A90D9')};
  transition: width 0.5s;
`

const ProgressLabel = styled.div`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
  margin-top: 4px;
  text-align: right;
`

const JobRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`

const OpenForgeBtn = styled.button`
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #4a90d9;
  border-radius: 8px;
  color: #4a90d9;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;

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

export default function TrainingStatusPage() {
  const { t } = useTranslation('learn')
  const { jobs, loading, refetch } = useTrainingJobs()

  const formatTime = (iso) => {
    if (!iso) return '—'
    return dayjs(iso).format('MM-DD HH:mm')
  }

  const calcElapsed = (start) => {
    if (!start) return '—'
    const diff = dayjs().diff(dayjs(start), 'minute')
    if (diff < 60) return t('trainingStatus.timeMinutes', { diff })
    return t('trainingStatus.timeHoursMinutes', { hours: Math.floor(diff / 60), minutes: diff % 60 })
  }

  return (
    <Page>
      <PageTitle>{t('trainingStatus.title')}</PageTitle>
      <PageSub>{t('trainingStatus.subtitle')}</PageSub>

      <HeaderRow>
        <div style={{ fontSize: 13, color: 'var(--color-secondary-50, #848c9d)' }}>
          {t('trainingStatus.activeJobs', { count: jobs.filter((j) => j.status === 'running').length })}
        </div>
        <RefreshBtn onClick={refetch} disabled={loading}>
          {t('trainingStatus.refresh')}
        </RefreshBtn>
      </HeaderRow>

      {loading ? (
        <Empty>{t('trainingStatus.loading')}</Empty>
      ) : jobs.length === 0 ? (
        <Empty>{t('trainingStatus.empty')}</Empty>
      ) : (
        <JobList>
          {jobs.map((job) => (
            <JobCard key={job.id}>
              <JobLeft>
                <JobName>{job.name}</JobName>
                <JobMeta>
                  <MetaItem>
                    {t('trainingStatus.model')}:<span>{job.foundationModel}</span>
                  </MetaItem>
                  <MetaItem>
                    Dataset:<span>{job.dataset}</span>
                  </MetaItem>
                  <MetaItem>
                    {t('trainingStatus.started')}:<span>{formatTime(job.startedAt)}</span>
                  </MetaItem>
                  {job.status === 'running' && (
                    <MetaItem>
                      {t('trainingStatus.elapsed')}:<span>{calcElapsed(job.startedAt)}</span>
                    </MetaItem>
                  )}
                  {job.completedAt && (
                    <MetaItem>
                      {t('trainingStatus.completedAt')}:<span>{formatTime(job.completedAt)}</span>
                    </MetaItem>
                  )}
                </JobMeta>
                {job.status === 'running' && (
                  <ProgressWrapper>
                    <ProgressBar>
                      <ProgressFill $value={job.progress} $status={job.status} />
                    </ProgressBar>
                    <ProgressLabel>{job.progress}%</ProgressLabel>
                  </ProgressWrapper>
                )}
              </JobLeft>

              <JobRight>
                <StatusBadge status={job.status} />
                <OpenForgeBtn onClick={() => openForge(`/training/${job.id}`)}>{t('trainingStatus.viewForge')}</OpenForgeBtn>
              </JobRight>
            </JobCard>
          ))}
        </JobList>
      )}
    </Page>
  )
}
