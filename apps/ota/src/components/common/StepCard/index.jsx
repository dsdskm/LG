import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CardContainer } from './styles'
import { useTranslation } from 'react-i18next'
import { Icon, IconButton, Table, UITooltip } from '@repo/ui'
import { toast } from 'react-toastify'

const FullscreenImageModal = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
      />
    </div>,
    document.body
  )
}

const StepCard = ({ title, extra, steps, currentStep, setCurrentStep, noPadding }) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showValue, setShowValue] = useState(false)
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')

  const [copiedItem, setCopiedItem] = useState({ id: null, field: null })

  useEffect(() => {
    setShowValue(false)
  }, [currentStep])

  useEffect(() => {
    if (copiedItem.id !== null) {
      const timer = setTimeout(() => {
        setCopiedItem({ id: null, field: null })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copiedItem])

  const handleCopy = (text, id, field) => {
    if (text) {
      navigator.clipboard.writeText(text)
      toast.success(t('copied', 'Copied'), { autoClose: 2000 })
      setCopiedItem({ id, field })
    }
  }

  const columns = [
    {
      name: 'Key',
      selector: (row) => row.keyText,
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="typographyBody5" style={{ fontWeight: 600, color: '#374151' }}>
            {row.keyText}
          </span>
          <IconButton
            size="sm"
            onClick={() => handleCopy(row.keyText, row.id, 'key')}
            data-tooltip-id="copy-tooltip"
            data-tooltip-desc={
              copiedItem.id === row.id && copiedItem.field === 'key' ? t('copied', 'Copied') : t('copyKey', 'Copy Key')
            }
          >
            <Icon name={copiedItem.id === row.id && copiedItem.field === 'key' ? 'copied' : 'copy'} size={18} />
          </IconButton>
        </div>
      )
    },
    {
      name: 'Value',
      selector: (row) => row.valueText,
      cell: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="typographyBody5" style={{ fontWeight: 600, color: '#374151' }}>
            *****
          </span>
          <IconButton
            size="sm"
            onClick={() => handleCopy(row.valueText, row.id, 'value')}
            data-tooltip-id="copy-tooltip"
            data-tooltip-desc={
              copiedItem.id === row.id && copiedItem.field === 'value'
                ? t('copied', 'Copied')
                : t('copyValue', 'Copy Value')
            }
          >
            <Icon name={copiedItem.id === row.id && copiedItem.field === 'value' ? 'copied' : 'copy'} size={18} />
          </IconButton>
        </div>
      )
    }
  ]

  const tableData = [
    {
      id: 1,
      keyText: import.meta.env.VITE_CI_COSIGN_KEY_KEY,
      valueText: import.meta.env.VITE_CI_COSIGN_KEY_VALUE
    },
    {
      id: 2,
      keyText: import.meta.env.VITE_CI_COSIGN_PASSWORD_KEY,
      valueText: import.meta.env.VITE_CI_COSIGN_PASSWORD_VALUE
    }
  ]

  return (
    <CardContainer $noPadding={noPadding}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="typographyBody4">{title}</span>
          {extra}
        </div>
      )}
      <p className="typographyBody5" style={{ marginTop: '0.75rem' }}>
        {steps[currentStep].description}
      </p>

      {currentStep === 2 && (
        <div style={{ marginTop: '1.5rem' }}>
          <Table columns={columns} data={tableData} />
        </div>
      )}

      {steps[currentStep].imgUrl && (
        <>
          <img
            src={steps[currentStep].imgUrl}
            alt={steps[currentStep].title}
            onClick={() => setIsFullscreen(true)}
            style={{
              margin: '3rem 0',
              padding: '1rem',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              cursor: 'zoom-in'
            }}
          />
          <p className="typographyBody6" style={{ textAlign: 'right', paddingRight: '1rem' }}>
            {t('clickImageToZoomIn')}
          </p>
          {isFullscreen && (
            <FullscreenImageModal
              src={steps[currentStep].imgUrl}
              alt={steps[currentStep].title}
              onClose={() => setIsFullscreen(false)}
            />
          )}
        </>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginTop: 'auto',
          paddingTop: '1.5rem'
        }}
      >
        {steps.map((_, index) => (
          <div
            key={index}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: currentStep === index ? '#0056b3' : '#d9d9d9',
              transition: 'background-color 0.3s ease'
            }}
            onClick={() => setCurrentStep(index)}
          />
        ))}
      </div>
      <UITooltip id="copy-tooltip" />
    </CardContainer>
  )
}

export default StepCard
