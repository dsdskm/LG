import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useParams, useNavigate } from 'react-router-dom'
import FilterBar from '../components/common/FilterBar'
import EpisodeCandidateList from '../components/tms/EpisodeCandidateList'
import EpisodeReviewPanel from '../components/tms/EpisodeReviewPanel'
import { useEpisodeCandidates } from '../hooks/useEpisodeCandidates'
import { registerEpisodesOnNas, sendNasToForge } from '../services/nasApi'
import { openForge } from '../services/forgeApi'

const Page = styled.div`
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: calc(100vh - 80px);
`

const PageHeader = styled.div``

const PageTitle = styled.h1`
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
`

const PageMeta = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);
`

const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
`

const ListPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
`

const ListTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-secondary-50, #848c9d);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const SummaryBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--color-neutral-10, #fff);
  border: 1px solid var(--color-secondary-20, #dadde2);
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 12px;
`

const SummaryStats = styled.div`
  display: flex;
  gap: 20px;
`

const StatItem = styled.div`
  font-size: 13px;
  color: var(--color-secondary-50, #848c9d);

  span {
    font-weight: 700;
    color: ${({ $color }) => $color || 'var(--color-secondary-90, #262f44)'};
    margin-left: 4px;
  }
`

const SendBtn = styled.button`
  padding: 10px 20px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #3a7bc8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

export default function TmsEpisodeCandidatePage() {
  const { t } = useTranslation('learn')
  const { executionId } = useParams()
  const navigate = useNavigate()
  const { candidates, loading, reviewMap, updateReview, summary } = useEpisodeCandidates(executionId)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({})
  const [sending, setSending] = useState(false)
  const [nasDataset, setNasDataset] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferred, setTransferred] = useState(false)
  const [sendError, setSendError] = useState(null)

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  const handleSaveToNas = async () => {
    const accepted = candidates.filter((ep) => reviewMap[ep.id] === 'accepted')
    if (accepted.length === 0) return
    setSending(true)
    setSendError(null)
    try {
      const result = await registerEpisodesOnNas(
        executionId,
        accepted.map((e) => e.id)
      )
      setNasDataset(result)
    } catch (e) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  const handleSendToForge = async () => {
    if (!nasDataset) return
    setTransferring(true)
    setSendError(null)
    try {
      await sendNasToForge(nasDataset.id)
      setTransferred(true)
    } catch (e) {
      setSendError(e.message)
    } finally {
      setTransferring(false)
    }
  }

  const FILTER_DEFS = [
    {
      key: 'step',
      label: 'Step',
      type: 'select',
      options: Array.from({ length: 5 }, (_, i) => ({ value: `Step ${i + 1}`, label: `Step ${i + 1}` }))
    },
    {
      key: 'status',
      label: t('episodeCandidate.filterStatus'),
      type: 'select',
      options: [
        { value: 'success', label: t('episodeCandidate.statusOptions.success') },
        { value: 'failed', label: t('episodeCandidate.statusOptions.failed') },
        { value: 'retry', label: t('episodeCandidate.statusOptions.retry') }
      ]
    },
    { key: 'hasIntervention', label: 'Intervention', type: 'checkbox', checkLabel: t('episodeCandidate.interventionFilter') }
  ]

  if (loading) {
    return (
      <Page>
        <div style={{ color: 'var(--color-secondary-50, #848c9d)' }}>{t('episodeCandidate.loading')}</div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <PageTitle>{t('episodeCandidate.title')}</PageTitle>
        <PageMeta>{t('episodeCandidate.executionId', { id: executionId })}</PageMeta>
      </PageHeader>

      <FilterBar filters={FILTER_DEFS} values={filters} onChange={handleFilterChange} />

      <SplitLayout>
        <ListPane>
          <ListTitle>{t('episodeCandidate.listTitle', { count: candidates.length })}</ListTitle>
          <EpisodeCandidateList
            episodes={candidates}
            reviewMap={reviewMap}
            selectedId={selected?.id}
            onSelect={setSelected}
            filters={filters}
          />
        </ListPane>

        <EpisodeReviewPanel
          episode={selected}
          reviewStatus={selected ? reviewMap[selected.id] : null}
          onReview={updateReview}
        />
      </SplitLayout>

      <SummaryBar>
        <SummaryStats>
          <StatItem $color="#51CF66">
            {t('episodeCandidate.summary.accepted')}:<span>{summary.accepted}</span>
          </StatItem>
          <StatItem $color="#FCC419">
            {t('episodeCandidate.summary.pending')}:<span>{summary.pending}</span>
          </StatItem>
          <StatItem $color="#FF6B6B">
            {t('episodeCandidate.summary.rejected')}:<span>{summary.rejected}</span>
          </StatItem>
          <StatItem>
            {t('episodeCandidate.summary.total')}:<span>{summary.total}</span>
          </StatItem>
        </SummaryStats>
        {!nasDataset ? (
          <>
            <SendBtn disabled={summary.accepted === 0 || sending} onClick={handleSaveToNas}>
              {sending ? t('common.saving') : t('episodeCandidate.nasSaveBtn', { count: summary.accepted })}
            </SendBtn>
            {sendError && <span style={{ fontSize: 12, color: '#FF6B6B', marginLeft: 12 }}>{t('common.errorPrefix')}{sendError}</span>}
          </>
        ) : !transferred ? (
          <>
            <span style={{ fontSize: 13, color: '#51CF66', marginRight: 12 }}>
              {t('episodeCandidate.nasSaved', { id: nasDataset.id })}
            </span>
            <SendBtn onClick={handleSendToForge} disabled={transferring}>
              {transferring ? t('common.sendingToForge') : t('episodeCandidate.forgeBtn')}
            </SendBtn>
            {sendError && <span style={{ fontSize: 12, color: '#FF6B6B', marginLeft: 12 }}>{t('common.errorPrefix')}{sendError}</span>}
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: '#51CF66', marginRight: 12 }}>{t('episodeCandidate.forgeSent')}</span>
            <SendBtn onClick={() => openForge('/datasets')}>{t('episodeCandidate.viewForgeBtn')}</SendBtn>
            <SendBtn
              onClick={() => navigate('/learning/')}
              style={{
                marginLeft: 8,
                background: 'var(--color-secondary-20, #dadde2)',
                color: 'var(--color-secondary-70, #555e72)'
              }}
            >
              {t('episodeCandidate.doneBtn')}
            </SendBtn>
          </>
        )}
      </SummaryBar>
    </Page>
  )
}
