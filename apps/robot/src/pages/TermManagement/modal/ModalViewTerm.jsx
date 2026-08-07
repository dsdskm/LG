import { useEffect, useMemo, useState } from 'react'
import { Modal, ModalButton, Dropdown } from '@repo/ui'
import { termsApis } from '@/apis'

const getLangOptions = (t, langs) =>
  (langs || []).map((lang) => ({
    value: lang,
    name: t(`termManagement.lang${lang.charAt(0)}${lang.slice(1).toLowerCase()}`)
  }))

const ModalViewTerm = ({ isOpen, t, tCommon, term, onClose }) => {
  const langOptions = useMemo(() => getLangOptions(t, term?.termSupportedLangs), [t, term])

  const [selectedLang, setSelectedLang] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  // 모달이 열릴 때 대상 약관의 첫 번째 지원 언어로 초기화
  useEffect(() => {
    if (isOpen && term) {
      setSelectedLang(term.termSupportedLangs?.[0] || '')
    }
  }, [isOpen, term])

  // 선택된 언어의 약관 전문을 CDN 에서 조회
  useEffect(() => {
    if (!isOpen || !term?.objectKeyPrefix || !selectedLang) return

    const fetchContent = async () => {
      setIsLoading(true)
      setIsError(false)
      try {
        const text = await termsApis.getTermContent(term.objectKeyPrefix, selectedLang)
        setContent(text)
      } catch (e) {
        console.error('약관 전문 조회 실패:', e)
        setContent('')
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [isOpen, term, selectedLang])

  return (
    <Modal
      isOpen={isOpen}
      title={t('termManagement.viewTitle')}
      onClose={onClose}
      closeButton
      size="lg"
      renderButtonComponent={<ModalButton onClick={onClose}>{tCommon('close')}</ModalButton>}
    >
      <div style={{ marginLeft: '1rem', paddingRight: '1rem' }}>
        {langOptions.length > 1 && (
          <div style={{ marginBottom: '1rem' }}>
            <Dropdown size="lg" minWidth="200px" value={selectedLang} options={langOptions} onChange={setSelectedLang} />
          </div>
        )}

        <div style={{ height: '560px', border: '1px solid var(--color-border, #e0e0e0)', borderRadius: '8px', overflow: 'hidden' }}>
          {isLoading && <p style={{ padding: '1.5rem' }}>{t('termManagement.viewLoading')}</p>}
          {!isLoading && isError && <p style={{ padding: '1.5rem' }}>{t('termManagement.viewFailMessage')}</p>}
          {!isLoading && !isError && (
            <iframe
              title={t('termManagement.viewTitle')}
              srcDoc={content}
              sandbox=""
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ModalViewTerm
