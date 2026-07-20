import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { createTeleopSession } from '../services/dmApi'
import { openForge } from '../services/forgeApi'
import { useLearning } from '../context/LearningContext'
import Card from '../components/common/Card'
import RobotSelectorPanel from '../components/common/RobotSelectorPanel'

const Page = styled.div`
  padding: 32px;
  max-width: 800px;
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

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-secondary-70, #555e72);
`

const Select = styled.select`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-10, #fff);
  color: var(--color-secondary-90, #262f44);
  font-size: 14px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: #7b61ff;
  }
`

const Input = styled.input`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-10, #fff);
  color: var(--color-secondary-90, #262f44);
  font-size: 14px;
  outline: none;
  width: 120px;

  &:focus {
    border-color: #7b61ff;
  }
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--color-secondary-20, #dadde2);
  margin: 8px 0;
`

const ForgeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
`

const ForgeSectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-70, #555e72);
`

const ForgeBtn = styled.button`
  padding: 14px 24px;
  background: #7b61ff;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: #6a50e0;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const PurposeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PurposeChip = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ $selected }) => ($selected ? '#7B61FF' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(123,97,255,0.15)' : 'transparent')};
  color: ${({ $selected }) => ($selected ? '#7B61FF' : 'var(--color-secondary-50, #848c9d)')};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
`

const LockedField = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-secondary-20, #dadde2);
  background: var(--color-neutral-30, #f5f5f5);
  color: var(--color-secondary-70, #555e72);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LockBadge = styled.span`
  font-size: 11px;
  color: var(--color-secondary-50, #848c9d);
`

export default function TeleopPage() {
  const { t } = useTranslation('learn')
  const { state } = useLearning()
  const [config, setConfig] = useState({
    task: state.selectedTask || '',
    goalEpisodes: 10,
    robotId: '',
    purpose: ''
  })
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)

  const canOpen = config.task && config.robotId

  const handleOpenForge = async () => {
    if (!canOpen) return
    setOpening(true)
    setOpenError(null)
    try {
      const session = await createTeleopSession(config)
      openForge(`/data-collector?sessionId=${session.id}`)
    } catch (e) {
      setOpenError(e.message)
    } finally {
      setOpening(false)
    }
  }

  const purposeOptions = t('teleop.purposes', { returnObjects: true })
  const taskOptions = t('teleop.taskOptions', { returnObjects: true })

  return (
    <Page>
      <PageTitle>{t('teleop.title')}</PageTitle>
      <PageSub>{t('teleop.subtitle')}</PageSub>

      <Card>
        <Form>
          <Field>
            <Label>{t('teleop.taskSelectLabel')}</Label>
            {state.selectedTask ? (
              <LockedField>
                <span>{state.selectedTask}</span>
                <LockBadge>{t('teleop.taskLockedBadge')}</LockBadge>
              </LockedField>
            ) : (
              <Select value={config.task} onChange={(e) => setConfig((c) => ({ ...c, task: e.target.value }))}>
                <option value="">{t('teleop.taskSelectPlaceholder')}</option>
                {Array.isArray(taskOptions) && taskOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field>
            <Label>{t('teleop.goalEpisodesLabel')}</Label>
            <Input
              type="number"
              min={1}
              value={config.goalEpisodes}
              onChange={(e) => setConfig((c) => ({ ...c, goalEpisodes: Number(e.target.value) }))}
            />
          </Field>

          <Field>
            <Label>{t('teleop.robotSelectLabel')}</Label>
            <RobotSelectorPanel value={config.robotId} onChange={(id) => setConfig((c) => ({ ...c, robotId: id }))} />
          </Field>

          <Field>
            <Label>{t('teleop.purposeLabel')}</Label>
            <PurposeGrid>
              {Array.isArray(purposeOptions) && purposeOptions.map((p) => (
                <PurposeChip
                  key={p}
                  $selected={config.purpose === p}
                  onClick={() => setConfig((c) => ({ ...c, purpose: p }))}
                >
                  {p}
                </PurposeChip>
              ))}
            </PurposeGrid>
          </Field>

          <Divider />

          <ForgeSection>
            <ForgeSectionTitle>{t('teleop.forgeSectionTitle')}</ForgeSectionTitle>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-secondary-50, #848c9d)' }}>
              {t('teleop.forgeSectionDesc')}
            </p>
            {!canOpen && <p style={{ margin: 0, fontSize: 12, color: '#FCC419' }}>{t('teleop.selectFirstWarning')}</p>}
            {openError && <p style={{ margin: 0, fontSize: 12, color: '#FF6B6B' }}>{t('common.errorPrefix')}{openError}</p>}
            <ForgeBtn onClick={handleOpenForge} disabled={!canOpen || opening}>
              {opening ? t('teleop.creatingSession') : t('teleop.openForgeBtn')}
            </ForgeBtn>
          </ForgeSection>
        </Form>
      </Card>
    </Page>
  )
}
