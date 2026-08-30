import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import StepWizard from '../components/common/StepWizard'
import TaskflowSelector from '../components/tms/TaskflowSelector'
import ExecutionConfig from '../components/tms/ExecutionConfig'
import { useTmsExecutions } from '../hooks/useTmsExecutions'
import { useLearning } from '../context/LearningContext'
import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'

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
  margin: 0 0 32px 0;
  font-size: 14px;
  color: var(--color-secondary-50, #848c9d);
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 8px;
`

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SummaryLabel = styled.span`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
`

const SummaryValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
`

const RunBtn = styled.button`
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  background: #4a90d9;
  color: #fff;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;

  &:hover {
    background: #3a7bc8;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const ExecutionStatus = styled.div`
  text-align: center;
  padding: 32px;
`

const ProgressBar = styled.div`
  height: 8px;
  border-radius: 4px;
  background: var(--color-secondary-20, #dadde2);
  margin: 16px 0;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 4px;
  width: ${({ $value }) => $value}%;
  background: #4a90d9;
  transition: width 0.5s;
`

const TaskContext = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(47, 146, 159, 0.08);
  border: 1px solid rgba(47, 146, 159, 0.2);
  font-size: 13px;
  color: var(--color-primary-60, #2f929f);
  font-weight: 600;
  margin-bottom: 24px;
`

export default function TmsLearningPage() {
  const { t } = useTranslation('learn')
  const navigate = useNavigate()
  const { state } = useLearning()
  const [step, setStep] = useState(0)
  const [taskflow, setTaskflow] = useState(null)
  const [config, setConfig] = useState({
    robotIds: [],
    repeatCount: 1,
    purpose: 'data-collection',
    saveForLearning: true
  })
  const { execution, loading, startExecution, pollExecution } = useTmsExecutions()

  useEffect(() => {
    if (!execution || execution.status !== 'running') return
    const timer = setInterval(() => pollExecution(execution.id), 3000)
    return () => clearInterval(timer)
  }, [execution?.id, execution?.status, pollExecution])

  const handleRun = async () => {
    await startExecution({
      taskflowId: taskflow.id,
      taskflowName: taskflow.name,
      ...config
    })
    setStep(3)
  }

  const handleViewEpisodes = () => {
    if (execution) navigate(`/learning/tms/episodes/${execution.id}`)
  }

  return (
    <Page>
      <PageTitle>{t('tmsLearning.title')}</PageTitle>
      <PageSub>{t('tmsLearning.subtitle')}</PageSub>
      {state.selectedTask && <TaskContext>{t('tmsLearning.taskContext', { task: state.selectedTask })}</TaskContext>}

      <Card>
        <StepWizard
          steps={t('tmsLearning.steps', { returnObjects: true })}
          currentStep={step}
          onNext={() => setStep((s) => s + 1)}
          onBack={() => setStep((s) => s - 1)}
          nextDisabled={(step === 0 && !taskflow) || (step === 1 && config.robotIds.length === 0)}
          nextLabel={step === 2 ? null : undefined}
        >
          {step === 0 && (
            <TaskflowSelector selected={taskflow} onSelect={setTaskflow} suggestedTask={state.selectedTask} />
          )}

          {step === 1 && (
            <ExecutionConfig config={config} onChange={(updates) => setConfig((c) => ({ ...c, ...updates }))} />
          )}

          {step === 2 && taskflow && (
            <div>
              <SummaryGrid>
                <SummaryItem>
                  <SummaryLabel>{t('tmsLearning.summaryLabels.taskflow')}</SummaryLabel>
                  <SummaryValue>{taskflow.name}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>{t('tmsLearning.summaryLabels.repeatCount')}</SummaryLabel>
                  <SummaryValue>{t('tmsLearning.summaryLabels.repeatCountValue', { count: config.repeatCount })}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>{t('tmsLearning.summaryLabels.robotCount')}</SummaryLabel>
                  <SummaryValue>{t('tmsLearning.summaryLabels.robotCountValue', { count: config.robotIds.length })}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>{t('tmsLearning.summaryLabels.purpose')}</SummaryLabel>
                  <SummaryValue>{t(`executionConfig.purposes.${config.purpose}`, { defaultValue: config.purpose })}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>{t('tmsLearning.summaryLabels.saveForLearning')}</SummaryLabel>
                  <SummaryValue>{config.saveForLearning ? t('tmsLearning.summaryLabels.active') : t('tmsLearning.summaryLabels.inactive')}</SummaryValue>
                </SummaryItem>
              </SummaryGrid>
              <RunBtn onClick={handleRun} disabled={loading}>
                {loading ? t('tmsLearning.runningBtn') : t('tmsLearning.startBtn')}
              </RunBtn>
            </div>
          )}

          {step === 3 && execution && (
            <ExecutionStatus>
              <StatusBadge status={execution.status} />
              <h3 style={{ color: 'var(--color-secondary-90, #262f44)', marginTop: 16 }}>{t('tmsLearning.executionId', { id: execution.id })}</h3>
              <ProgressBar>
                <ProgressFill $value={execution.progress || 0} />
              </ProgressBar>
              <p style={{ color: 'var(--color-secondary-50, #848c9d)', fontSize: 13 }}>
                {t('tmsLearning.progressLabel', { value: execution.progress || 0 })}
              </p>
              {execution.status === 'running' && (
                <p style={{ color: 'var(--color-secondary-50, #848c9d)', fontSize: 13, marginTop: 4 }}>
                  {t('tmsLearning.runningMsg')}
                </p>
              )}
              {execution.status === 'failed' && (
                <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 4 }}>
                  {t('tmsLearning.failedMsg')}
                </p>
              )}
              {execution.status === 'completed' && (
                <p style={{ color: '#51CF66', fontSize: 13, marginTop: 4 }}>{t('tmsLearning.completedMsg')}</p>
              )}
              <RunBtn onClick={handleViewEpisodes} disabled={execution.status === 'running'}>
                {t('tmsLearning.viewEpisodesBtn')}
              </RunBtn>
            </ExecutionStatus>
          )}
        </StepWizard>
      </Card>
    </Page>
  )
}
