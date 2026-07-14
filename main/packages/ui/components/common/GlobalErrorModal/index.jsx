import { useState } from 'react'
import { Modal, Button, Section, Icon } from '@repo/ui'
import { useErrorStore } from '@repo/stores'
import { useTranslation } from 'react-i18next'

const GlobalErrorModal = () => {
  const { error, clearError } = useErrorStore()
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!error) return null

  const response = error.response
  const status = response?.status
  const errorCode = error.code || response?.data?.code
  const message = t(error.message) || response?.data?.message || t('error.unexpected')
  const errors = error.errors || response?.data?.errors
  const title = t('error.title')

  return (
    <Modal
      isOpen={!!error}
      title={title}
      onClose={clearError}
      renderButtonComponent={
        <>
          <Button size="lg" onClick={clearError}>
            {t('confirm')}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '8rem',
          width: '100%'
        }}
      >
        <div>{message}</div>
        {import.meta.env.MODE === 'development' && (
          <div style={{ width: '100%', marginTop: '1rem' }}>
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'end',
                padding: '0.8rem 1rem',
                background: 'var(--color-neutral-10)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--color-neutral-70)'
              }}
            >
              <span>상세정보</span>
              <Icon name={isExpanded ? 'arrow_up' : 'arrow_down'} size={20} color="var(--color-neutral-60)" />
            </div>
            {isExpanded && (
              <Section>
                <div style={{ textAlign: 'left', padding: '1rem', fontSize: '1.5rem', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Status code:</strong> {status}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Error code:</strong> {errorCode}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Message:</strong> {message}
                  </div>
                  <div>
                    <strong>Detail:</strong>{' '}
                    {typeof errors === 'object' ? JSON.stringify(errors, null, 2) : String(errors)}
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default GlobalErrorModal
