import { useState } from 'react'
import { Modal, Button, Section, Icon } from '@repo/ui'
import { useErrorStore } from '@repo/stores'
import { useTranslation } from 'react-i18next'

const GlobalErrorModal = () => {
  const { error, clearError } = useErrorStore()
  const { t, i18n } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!error) return null

  const response = error.response
  const status = response?.status
  // BE 에러 코드(errConsts) 우선 — axios의 error.code('ERR_BAD_REQUEST' 등)는 뒤로
  const errorCode = response?.data?.code || error.code
  // errConsts code별 구체 메시지 → status별 일반 메시지 → BE 원문 → 알 수 없는 오류 (raw-key 노출 방지 위해 exists 확인)
  const codeKey = errorCode ? `error.code.${errorCode}` : null
  const message =
    (codeKey && i18n.exists(`common:${codeKey}`) && t(codeKey)) ||
    (error.message && i18n.exists(`common:${error.message}`) && t(error.message)) ||
    response?.data?.message ||
    t('error.unexpected')
  const errors = error.errors || response?.data?.errors
  const title = t('error.title')

  // 상세 패널: 값이 없거나 undefined 면 항목 자체를 표시하지 않음
  const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== ''
  const detailStr = errors == null ? '' : typeof errors === 'object' ? JSON.stringify(errors, null, 2) : String(errors)

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
                  {hasVal(status) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Status code:</strong> {status}
                    </div>
                  )}
                  {hasVal(errorCode) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Error code:</strong> {errorCode}
                    </div>
                  )}
                  {hasVal(message) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Message:</strong> {message}
                    </div>
                  )}
                  {hasVal(detailStr) && (
                    <div>
                      <strong>Detail:</strong> {detailStr}
                    </div>
                  )}
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
