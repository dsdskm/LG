import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StepWizard from '../components/common/StepWizard'
import VideoTypeSelector from '../components/lbw/VideoTypeSelector'
import PurposeSelector from '../components/lbw/PurposeSelector'
import QualityGuide from '../components/lbw/QualityGuide'
import VideoUploader from '../components/lbw/VideoUploader'
import MetadataForm from '../components/common/MetadataForm'
import { ForgeLink } from '../components/common/ForgeEmbed'
import Card from '../components/common/Card'
import { createNasDataset, uploadToNas, sendNasToForge } from '../services/nasApi'
import { sendNasToMotionRetargeting } from '../services/motionRetargetingApi'
import { useLearning } from '../context/LearningContext'

const Page = styled.div`
  padding: 32px;
  max-width: 900px;
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

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const StepTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
`

const StepDesc = styled.p`
  margin: -8px 0 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-secondary-50, #848c9d);
`

const PipelineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`

const PipelineCard = styled.button`
  padding: 18px;
  border-radius: 12px;
  border: 1px solid
    ${({ $selected }) => ($selected ? 'var(--color-primary-60, #2f929f)' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(47,146,159,0.08)' : 'var(--color-neutral-10, #fff)')};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--color-primary-60, #2f929f);
    background: rgba(47, 146, 159, 0.04);
  }
`

const PipelineTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 6px;
`

const PipelineDesc = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-secondary-50, #848c9d);
`

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  background: ${({ disabled }) =>
    disabled ? 'var(--color-secondary-20, #dadde2)' : 'var(--color-primary-60, #2f929f)'};
  color: ${({ disabled }) => (disabled ? 'var(--color-secondary-50, #848c9d)' : '#fff')};
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  margin-top: 8px;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }
`

const StatusMsg = styled.div`
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  background: ${({ $type }) => ($type === 'error' ? 'rgba(255,107,107,0.1)' : 'rgba(81,207,102,0.1)')};
  border: 1px solid ${({ $type }) => ($type === 'error' ? '#FF6B6B44' : '#51CF6644')};
  color: ${({ $type }) => ($type === 'error' ? '#FF6B6B' : '#2b8a3e')};
`

const InfoCard = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-30, #f7f8fa);
`

const InfoTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 6px;
`

const InfoText = styled.div`
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-secondary-50, #848c9d);
`

const PIPELINE_KEYS = ['cloid-retargeting', 'forge-video-to-motion']

export default function LearnByWatchingPage() {
  const { t } = useTranslation('learn')
  const { state } = useLearning()
  const [step, setStep] = useState(0)
  const [videoType, setVideoType] = useState(null)
  const [purposes, setPurposes] = useState([])
  const [pipeline, setPipeline] = useState('cloid-retargeting')
  const [files, setFiles] = useState([])
  const [metadata, setMetadata] = useState({
    taskName: state.selectedTask || '',
    targetRobot: 'cloid'
  })
  const [submitting, setSubmitting] = useState(false)
  const [nasDataset, setNasDataset] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferred, setTransferred] = useState(false)
  const [processingJob, setProcessingJob] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    setMetadata((m) => ({
      ...m,
      targetRobot: pipeline === 'cloid-retargeting' ? 'cloid' : m.targetRobot || 'generic'
    }))
  }, [pipeline])

  const togglePurpose = (value) => {
    setPurposes((p) => (p.includes(value) ? p.filter((x) => x !== value) : [...p, value]))
  }

  const handleSaveToNas = async () => {
    if (files.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const ds = await createNasDataset({
        name: metadata.taskName || `lbw-${Date.now()}`,
        source: 'lbw',
        pipeline,
        videoType,
        purposes,
        ...metadata
      })
      await uploadToNas(ds.id, files)
      setNasDataset(ds)
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleProcess = async () => {
    if (!nasDataset) return
    setTransferring(true)
    setSubmitError(null)
    try {
      if (pipeline === 'forge-video-to-motion') {
        await sendNasToForge(nasDataset.id)
      } else {
        const job = await sendNasToMotionRetargeting(nasDataset.id, {
          taskName: metadata.taskName,
          targetRobot: metadata.targetRobot,
          videoType,
          purposes
        })
        setProcessingJob(job)
      }
      setTransferred(true)
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setTransferring(false)
    }
  }

  const METADATA_FIELDS = [
    { key: 'taskName', label: t('lbw.metaTaskName'), required: true, placeholder: t('lbw.metaTaskPlaceholder') },
    { key: 'videoCount', label: t('lbw.metaVideoCount'), type: 'number', placeholder: '0' },
    {
      key: 'format',
      label: t('lbw.metaFormat'),
      type: 'select',
      options: [
        { value: 'mp4', label: 'MP4' },
        { value: 'mov', label: 'MOV' },
        { value: 'avi', label: 'AVI' }
      ]
    },
    {
      key: 'targetRobot',
      label: t('lbw.metaTargetRobot'),
      type: 'select',
      options: [
        { value: 'cloid', label: 'CLOiD' },
        { value: 'generic', label: t('lbw.metaGenericRobot') }
      ]
    },
    { key: 'notes', label: t('lbw.metaNotes'), placeholder: t('lbw.metaNotesPlaceholder') }
  ]

  const processButtonLabel =
    pipeline === 'cloid-retargeting' ? t('lbw.processCloidBtn') : t('lbw.processForgeBtn')

  return (
    <Page>
      <PageTitle>{t('lbw.title')}</PageTitle>
      <PageSub>{t('lbw.subtitle')}</PageSub>
      <Card>
        <StepWizard
          steps={t('lbw.steps', { returnObjects: true })}
          currentStep={step}
          onNext={() => setStep((s) => s + 1)}
          onBack={() => setStep((s) => s - 1)}
          nextDisabled={
            (step === 0 && !videoType) || (step === 1 && purposes.length === 0) || (step === 3 && !pipeline)
          }
        >
          {step === 0 && (
            <StepContent>
              <StepTitle>{t('lbw.step0Title')}</StepTitle>
              <VideoTypeSelector selected={videoType} onSelect={setVideoType} />
            </StepContent>
          )}

          {step === 1 && (
            <StepContent>
              <StepTitle>{t('lbw.step1Title')}</StepTitle>
              <PurposeSelector selected={purposes} onToggle={togglePurpose} />
            </StepContent>
          )}

          {step === 2 && (
            <StepContent>
              <StepTitle>{t('lbw.step2Title')}</StepTitle>
              <QualityGuide />
              <InfoCard>
                <InfoTitle>{t('lbw.step2InfoTitle')}</InfoTitle>
                <InfoText>{t('lbw.step2InfoText')}</InfoText>
              </InfoCard>
            </StepContent>
          )}

          {step === 3 && (
            <StepContent>
              <StepTitle>{t('lbw.step3Title')}</StepTitle>
              <StepDesc>{t('lbw.step3Desc')}</StepDesc>
              <PipelineGrid>
                {PIPELINE_KEYS.map((key) => (
                  <PipelineCard
                    key={key}
                    type="button"
                    $selected={pipeline === key}
                    onClick={() => setPipeline(key)}
                  >
                    <PipelineTitle>{t(`lbw.pipelines.${key}.title`)}</PipelineTitle>
                    <PipelineDesc>{t(`lbw.pipelines.${key}.description`)}</PipelineDesc>
                  </PipelineCard>
                ))}
              </PipelineGrid>
            </StepContent>
          )}

          {step === 4 && (
            <StepContent>
              <StepTitle>{t('lbw.step4Title')}</StepTitle>
              <VideoUploader files={files} onChange={setFiles} />

              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-secondary-70, #555e72)' }}>
                  {t('lbw.step4MinMeta')}
                </h4>
                <MetadataForm
                  fields={METADATA_FIELDS}
                  values={metadata}
                  onChange={(key, val) => setMetadata((m) => ({ ...m, [key]: val }))}
                  lockedKeys={state.selectedTask ? ['taskName'] : []}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-secondary-70, #555e72)' }}>
                  {t('lbw.step4ProcessReq')}
                </h4>

                {!nasDataset ? (
                  <>
                    <SubmitBtn onClick={handleSaveToNas} disabled={files.length === 0 || submitting}>
                      {submitting ? t('common.saving') : t('common.saveToNas')}
                    </SubmitBtn>
                    {files.length === 0 && (
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-secondary-50, #848c9d)' }}>
                        {t('lbw.uploadFirst')}
                      </p>
                    )}
                    {submitError && <StatusMsg $type="error">{t('common.errorPrefix')}{submitError}</StatusMsg>}
                  </>
                ) : !transferred ? (
                  <>
                    <StatusMsg>{t('common.saved', { id: nasDataset.id })}</StatusMsg>
                    <SubmitBtn onClick={handleProcess} disabled={transferring} style={{ marginTop: 8 }}>
                      {transferring ? t('lbw.processingBtn') : processButtonLabel}
                    </SubmitBtn>
                    {submitError && (
                      <StatusMsg $type="error" style={{ marginTop: 8 }}>
                        {t('common.errorPrefix')}{submitError}
                      </StatusMsg>
                    )}
                  </>
                ) : pipeline === 'cloid-retargeting' ? (
                  <>
                    <StatusMsg>
                      {t('lbw.successCloid')}
                      {processingJob?.jobId && (
                        <>
                          <br />
                          Job ID: {processingJob.jobId}
                        </>
                      )}
                      <br />
                      {t('lbw.successCloidNote')}
                    </StatusMsg>
                    <InfoCard style={{ marginTop: 12 }}>
                      <InfoTitle>{t('lbw.additionalInfoTitle')}</InfoTitle>
                      <InfoText>
                        {t('lbw.additionalInfoText')}
                        {processingJob?.status && (
                          <>
                            <br />
                            {t('lbw.currentStatus', { status: processingJob.status })}
                          </>
                        )}
                      </InfoText>
                    </InfoCard>
                  </>
                ) : (
                  <>
                    <StatusMsg>{t('lbw.successForge')}</StatusMsg>
                    <div style={{ marginTop: 12 }}>
                      <ForgeLink
                        path={`/data-generator/video-to-motion?datasetId=${nasDataset.id}`}
                        title={t('lbw.forgeViewTitle')}
                        description={t('lbw.forgeViewDesc')}
                      />
                    </div>
                  </>
                )}
              </div>
            </StepContent>
          )}
        </StepWizard>
      </Card>
    </Page>
  )
}
