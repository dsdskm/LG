import React, { useState, useEffect } from 'react'
import { Modal, Title, Button } from '@repo/ui'
import StepCard from '@/components/common/StepCard'
import { useTranslation } from 'react-i18next'

const GuideModal = ({ isOpen, onConfirm }) => {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: t('guideTitleStep1'),
      description: t('guideDescriptionStep1'),
      imgUrl: '/ota/assets/img/merge.png'
    },
    {
      title: t('guideTitleStep2'),
      description: t('guideDescriptionStep2'),
      imgUrl: '/ota/assets/img/menu.png'
    },
    {
      title: t('guideTitleStep3'),
      description: t('guideDescriptionStep3'),
      imgUrl: '/ota/assets/img/variables.png'
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1)
  }

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  useEffect(() => {
    return () => {
      setCurrentStep(0)
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      renderButtonComponent={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <Button
              size="md"
              theme="secondary"
              onClick={handlePrev}
              style={{ minWidth: '80px', marginRight: '8px' }}
              disabled={currentStep === 0}
            >
              {tCommon('prev', '이전')}
            </Button>
            <Button
              size="md"
              theme="secondary"
              onClick={handleNext}
              style={{ minWidth: '80px' }}
              disabled={currentStep === steps.length - 1}
            >
              {tCommon('next', '다음')}
            </Button>
          </div>
          <Button size="md" theme="primary" onClick={onConfirm} style={{ minWidth: '100px' }}>
            {tCommon('close')}
          </Button>
        </div>
      }
    >
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Title style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>{t('guideTitle')}</Title>
        <StepCard
          title={steps[currentStep].title}
          steps={steps}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </div>
    </Modal>
  )
}

export default GuideModal
