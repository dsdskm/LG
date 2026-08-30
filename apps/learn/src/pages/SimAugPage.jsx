import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import StepWizard from '../components/common/StepWizard'
import { ForgeLink } from '../components/common/ForgeEmbed'
import Card from '../components/common/Card'

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

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`

const Option = styled.div`
  padding: 18px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) => ($selected ? '#51CF66' : 'var(--color-secondary-20, #dadde2)')};
  background: ${({ $selected }) => ($selected ? 'rgba(81,207,102,0.08)' : 'var(--color-neutral-10, #fff)')};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #51cf66;
  }
`

const OptionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-secondary-90, #262f44);
  margin-bottom: 6px;
`

const OptionDesc = styled.div`
  font-size: 12px;
  color: var(--color-secondary-50, #848c9d);
  line-height: 1.4;
`

const ForgeCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const INPUT_TYPE_KEYS = ['augment-existing', 'image-synthetic', 'video-motion']
const GOAL_KEYS = ['expand', 'edge-case', 'env-diversity', 'scene-rebuild']
const FORGE_TOOL_KEYS = ['mimic', 'synthetic', 'videoToMotion']
const FORGE_TOOL_PATHS = { mimic: '/data-generator/mimic', synthetic: '/data-generator/wfm-synthetic', videoToMotion: '/data-generator/video-to-motion' }

export default function SimAugPage() {
  const { t } = useTranslation('learn')
  const [step, setStep] = useState(0)
  const [inputType, setInputType] = useState(null)
  const [goals, setGoals] = useState([])

  const toggleGoal = (value) => {
    setGoals((g) => (g.includes(value) ? g.filter((x) => x !== value) : [...g, value]))
  }

  return (
    <Page>
      <PageTitle>{t('simAug.title')}</PageTitle>
      <PageSub>{t('simAug.subtitle')}</PageSub>

      <Card>
        <StepWizard
          steps={t('simAug.steps', { returnObjects: true })}
          currentStep={step}
          onNext={() => setStep((s) => s + 1)}
          onBack={() => setStep((s) => s - 1)}
          nextDisabled={(step === 0 && !inputType) || (step === 1 && goals.length === 0)}
        >
          {step === 0 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--color-secondary-90, #262f44)' }}>
                {t('simAug.step0Title')}
              </h3>
              <OptionGrid>
                {INPUT_TYPE_KEYS.map((key) => (
                  <Option key={key} $selected={inputType === key} onClick={() => setInputType(key)}>
                    <OptionTitle>{t(`simAug.inputTypes.${key}.title`)}</OptionTitle>
                    <OptionDesc>{t(`simAug.inputTypes.${key}.desc`)}</OptionDesc>
                  </Option>
                ))}
              </OptionGrid>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--color-secondary-90, #262f44)' }}>
                {t('simAug.step1Title')}
              </h3>
              <OptionGrid>
                {GOAL_KEYS.map((key) => (
                  <Option key={key} $selected={goals.includes(key)} onClick={() => toggleGoal(key)}>
                    <OptionTitle>{t(`simAug.goals.${key}.title`)}</OptionTitle>
                    <OptionDesc>{t(`simAug.goals.${key}.desc`)}</OptionDesc>
                  </Option>
                ))}
              </OptionGrid>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--color-secondary-90, #262f44)' }}>
                {t('simAug.step2Title')}
              </h3>
              <ForgeCards>
                {FORGE_TOOL_KEYS.map((key) => (
                  <ForgeLink
                    key={key}
                    path={FORGE_TOOL_PATHS[key]}
                    title={t(`simAug.forgeTools.${key}.title`)}
                    description={t(`simAug.forgeTools.${key}.description`)}
                  />
                ))}
              </ForgeCards>
            </div>
          )}
        </StepWizard>
      </Card>
    </Page>
  )
}
