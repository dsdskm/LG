import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import MetadataForm from '../components/common/MetadataForm'
import { ForgeLink } from '../components/common/ForgeEmbed'
import Card from '../components/common/Card'
import { createNasDataset, uploadToNas, sendNasToForge } from '../services/nasApi'
import { openForge } from '../services/forgeApi'
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

const Section = styled.div`
  margin-bottom: 28px;
`

const SectionTitle = styled.h3`
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-70, #555e72);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-secondary-20, #dadde2);
`

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`

const TypeItem = styled.div`
  padding: 14px 18px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => ($selected ? '#868E96' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(134,142,150,0.1)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  font-size: 13px;
  color: var(--color-secondary-90, #262f44);
  transition: all 0.15s;

  &:hover {
    border-color: #868e96;
  }
`

const DropZone = styled.div`
  border: 2px dashed ${({ $dragOver }) => ($dragOver ? '#868E96' : 'var(--color-secondary-20, #dadde2)')};
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  background: var(--color-neutral-10, #fff);
  transition: all 0.2s;

  &:hover {
    border-color: #868e96;
  }
`

const FormatCheckResult = styled.div`
  padding: 14px 18px;
  border-radius: 8px;
  background: ${({ $pass }) => ($pass ? 'rgba(81,207,102,0.1)' : 'rgba(255,107,107,0.1)')};
  border: 1px solid ${({ $pass }) => ($pass ? '#51CF6644' : '#FF6B6B44')};
  font-size: 13px;
  color: ${({ $pass }) => ($pass ? '#51CF66' : '#FF6B6B')};
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

  &:hover:not(:disabled) {
    opacity: 0.88;
  }
`

const StatusMsg = styled.div`
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  background: ${({ $type }) => ($type === 'error' ? 'rgba(255,107,107,0.1)' : 'rgba(81,207,102,0.1)')};
  border: 1px solid ${({ $type }) => ($type === 'error' ? '#FF6B6B44' : '#51CF6644')};
  color: ${({ $type }) => ($type === 'error' ? '#FF6B6B' : '#51CF66')};
`

export default function UploadPage() {
  const { t } = useTranslation('learn')
  const { state } = useLearning()
  const [dataType, setDataType] = useState(null)
  const [metadata, setMetadata] = useState({ taskName: state.selectedTask || '' })
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [formatCheck, setFormatCheck] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [nasDataset, setNasDataset] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [transferred, setTransferred] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const inputRef = useRef(null)

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    setFiles((f) => [...f, ...arr])
    setFormatCheck(arr.every((f) => f.name.endsWith('.json') || f.name.endsWith('.hdf5') || f.name.endsWith('.zip')))
  }

  const handleSaveToNas = async () => {
    if (!dataType || files.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const ds = await createNasDataset({
        name: metadata.taskName || `upload-${Date.now()}`,
        source: 'upload',
        dataType,
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

  const handleSendToForge = async () => {
    if (!nasDataset) return
    setTransferring(true)
    setSubmitError(null)
    try {
      await sendNasToForge(nasDataset.id)
      setTransferred(true)
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setTransferring(false)
    }
  }

  const DATA_TYPES = t('upload.dataTypes', { returnObjects: true })

  const METADATA_FIELDS = [
    { key: 'taskName', label: t('upload.metaTaskName'), required: true, placeholder: t('upload.metaTaskPlaceholder') },
    {
      key: 'robotType',
      label: t('upload.metaRobotType'),
      type: 'select',
      options: [
        { value: 'RSP-7', label: 'RSP-7' },
        { value: 'RSP-9', label: 'RSP-9' }
      ]
    },
    {
      key: 'modality',
      label: t('upload.metaModality'),
      type: 'select',
      options: [
        { value: 'vision', label: 'Vision' },
        { value: 'state', label: 'State' },
        { value: 'force', label: 'Force' },
        { value: 'vision+state', label: 'Vision + State' }
      ]
    },
    {
      key: 'hasLabel',
      label: t('upload.metaHasLabel'),
      type: 'select',
      options: [
        { value: 'yes', label: t('upload.metaHasLabelYes') },
        { value: 'no', label: t('upload.metaHasLabelNo') }
      ]
    },
    {
      key: 'purpose',
      label: t('upload.metaPurpose'),
      type: 'select',
      options: [
        { value: 'pre-training', label: 'Pre-Training' },
        { value: 'fine-tuning', label: 'Fine-tuning' },
        { value: 'benchmark', label: 'Benchmark' }
      ]
    }
  ]

  return (
    <Page>
      <PageTitle>{t('upload.title')}</PageTitle>
      <PageSub>{t('upload.subtitle')}</PageSub>

      <Card>
        <Section>
          <SectionTitle>{t('upload.dataTypeSection')}</SectionTitle>
          <TypeGrid>
            {Array.isArray(DATA_TYPES) && DATA_TYPES.map((type) => (
              <TypeItem key={type} $selected={dataType === type} onClick={() => setDataType(type)}>
                {type}
              </TypeItem>
            ))}
          </TypeGrid>
        </Section>

        <Section>
          <SectionTitle>{t('upload.metadataSection')}</SectionTitle>
          <MetadataForm
            fields={METADATA_FIELDS}
            values={metadata}
            onChange={(key, val) => setMetadata((m) => ({ ...m, [key]: val }))}
            lockedKeys={state.selectedTask ? ['taskName'] : []}
          />
        </Section>

        <Section>
          <SectionTitle>{t('upload.fileSection')}</SectionTitle>
          <DropZone
            $dragOver={dragOver}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📤</div>
            <div
              style={{ fontSize: 14, color: 'var(--color-secondary-90, #262f44)', fontWeight: 600, marginBottom: 6 }}
            >
              {t('upload.dropZoneTitle')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-secondary-50, #848c9d)' }}>
              {t('upload.dropZoneSubtitle')}{files.length > 0 && t('upload.selectedFiles', { count: files.length })}
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </DropZone>

          {formatCheck !== null && (
            <FormatCheckResult $pass={formatCheck} style={{ marginTop: 12 }}>
              {formatCheck ? t('upload.formatOk') : t('upload.formatError')}
            </FormatCheckResult>
          )}
        </Section>

        <Section>
          <SectionTitle>{t('upload.nasSection')}</SectionTitle>
          {!nasDataset ? (
            <>
              <SubmitBtn
                onClick={handleSaveToNas}
                disabled={!dataType || files.length === 0 || formatCheck === false || submitting}
              >
                {submitting ? t('common.saving') : t('common.saveToNas')}
              </SubmitBtn>
              {!dataType && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-secondary-50, #848c9d)' }}>
                  {t('upload.selectTypeFirst')}
                </p>
              )}
              {submitError && <StatusMsg $type="error">{t('common.errorPrefix')}{submitError}</StatusMsg>}
            </>
          ) : !transferred ? (
            <>
              <StatusMsg>{t('common.saved', { id: nasDataset.id })}</StatusMsg>
              <SubmitBtn onClick={handleSendToForge} disabled={transferring} style={{ marginTop: 12 }}>
                {transferring ? t('common.sendingToForge') : t('common.sendToForge')}
              </SubmitBtn>
              {submitError && (
                <StatusMsg $type="error" style={{ marginTop: 8 }}>
                  {t('common.errorPrefix')}{submitError}
                </StatusMsg>
              )}
            </>
          ) : (
            <>
              <StatusMsg>{t('common.sentToForge')}</StatusMsg>
              <div style={{ marginTop: 12 }}>
                <ForgeLink
                  path={`/datasets/${nasDataset.id}`}
                  title={t('upload.forgeViewTitle')}
                  description={t('upload.forgeViewDesc')}
                />
              </div>
            </>
          )}
        </Section>
      </Card>
    </Page>
  )
}
