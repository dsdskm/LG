import { useEffect, useMemo, useState } from 'react'
import { Modal, ModalButton, Dropdown, Input, Textarea, ToggleSwitch } from '@repo/ui'
import { toast } from 'react-toastify'
import { termsApis } from '@/apis'

const EMPTYVALUE = ''

// 약관 그룹은 아직 API 가 없어 대표적인 약관 유형을 프리셋으로 제공한다.
// (추후 termApis 연동 시 options 를 서버 목록으로 교체)
const getTermGroupOptions = (t) => [
  { value: 'SERVICE_POLICY', name: t('termManagement.groupServicePolicy') },
  { value: 'PRIVACY_POLICY', name: t('termManagement.groupPrivacyPolicy') },
  { value: 'MARKETING_RECEIPT', name: t('termManagement.groupMarketingReceipt') },
  { value: 'THIRD_PARTY_SHARING', name: t('termManagement.groupThirdPartySharging') },
  { value: 'LOCATION_SERVICE', name: t('termManagement.groupLocationService') }
]

const getTermLangOptions = (t) => [
  { value: 'KO', name: t('termManagement.langKo') },
  { value: 'EN', name: t('termManagement.langEn') },
  { value: 'JA', name: t('termManagement.langJa') }
]

const ModalCreateTerm = ({ isOpen, t, onClose, onConfirm }) => {
  const termGroupOptions = useMemo(() => getTermGroupOptions(t), [t])
  const termLangOptions = useMemo(() => getTermLangOptions(t), [t])

  const [termGroup, setTermGroup] = useState(EMPTYVALUE)
  const [versionMajor, setVersionMajor] = useState('1')
  const [versionMinor, setVersionMinor] = useState('0')
  const [termLang, setTermLang] = useState('KO')
  const [content, setContent] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 모달이 열릴 때마다 입력값 초기화
  useEffect(() => {
    if (isOpen) {
      setTermGroup(EMPTYVALUE)
      setVersionMajor('1')
      setVersionMinor('0')
      setTermLang('KO')
      setContent('')
      setIsRequired(true)
      setIsActive(true)
      setIsSubmitting(false)
    }
  }, [isOpen])

  // 저장 버튼 활성화 조건: 그룹 선택 + 버전(major) + 내용 입력
  const isBtnValid = useMemo(() => {
    if (!termGroup) return false
    if (!versionMajor.trim()) return false
    if (!content.trim()) return false
    return true
  }, [termGroup, versionMajor, content])

  const onSubmit = async () => {
    if (!isBtnValid || isSubmitting) return

    // presigned url / 저장 API 에 공통으로 사용하는 약관 식별 정보
    const termInfo = {
      termGroup,
      termVersionMajor: Number(versionMajor),
      termVersionMinor: Number(versionMinor || 0),
      termSupportedLangs: [termLang]
    }

    setIsSubmitting(true)
    try {
      // 1. presigned url 획득
      const uploadUrlRes = await termsApis.postUploadUrl({
        ...termInfo,
        fileExt: 'md',
        fileContentType: 'text/markdown'
      })

      const target = uploadUrlRes?.content?.[0]
      if (!target?.presignedUrl) throw new Error('presigned URL 없음')

      // 2. 약관 내용을 md 파일로 만들어 presigned url 로 업로드
      const headers = (target.headers || []).reduce((acc, h) => {
        acc[h.name] = h.value
        return acc
      }, {})
      const putRes = await fetch(target.presignedUrl, {
        method: 'PUT',
        headers,
        body: new Blob([content], { type: 'text/markdown' })
      })
      if (!putRes.ok) throw new Error(`파일 업로드 실패 (${putRes.status})`)

      // 3. 업로드 완료 후 입력 내용 저장
      await termsApis.postTerms({
        ...termInfo,
        isRequired,
        isActive
      })

      onConfirm?.()
    } catch (e) {
      console.error('약관 등록 실패:', e)
      toast.error(t('termManagement.createFailMessage'), { autoClose: 2000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={t('termManagement.addTitle')}
      onClose={onClose}
      closeButton
      renderButtonComponent={
        <>
          <ModalButton onClick={onClose}>{t('cancel')}</ModalButton>
          <ModalButton onClick={onSubmit} theme="primary" disabled={!isBtnValid || isSubmitting}>
            {t('save')}
          </ModalButton>
        </>
      }
    >
      <div style={{ maxHeight: '560px', marginLeft: '1rem', paddingRight: '1rem' }}>
        {/* 약관 그룹 */}
        <div>
          <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
            {t('termManagement.group')}
          </p>
          <Dropdown
            size="lg"
            minWidth="300px"
            placeholder={t('termManagement.selectGroupPlaceholder')}
            value={termGroup}
            options={termGroupOptions}
            onChange={setTermGroup}
          />
        </div>

        {/* 버전 (major.minor) */}
        <div style={{ marginTop: '1.6rem' }}>
          <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
            {t('termManagement.version')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Input
              type="number"
              size="md"
              placeholder="major"
              value={versionMajor}
              onChange={(e) => setVersionMajor(e.target.value)}
              style={{ width: '100px' }}
            />
            <span style={{ fontWeight: 'bold' }}>.</span>
            <Input
              type="number"
              size="md"
              placeholder="minor"
              value={versionMinor}
              onChange={(e) => setVersionMinor(e.target.value)}
              style={{ width: '100px' }}
            />
          </div>
        </div>

        {/* 언어 */}
        <div style={{ marginTop: '1.6rem' }}>
          <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
            {t('termManagement.lang')}
          </p>
          <Dropdown
            size="lg"
            minWidth="300px"
            placeholder={t('termManagement.selectLangPlaceholder')}
            value={termLang}
            options={termLangOptions}
            onChange={setTermLang}
          />
        </div>

        {/* 약관 내용 */}
        <div style={{ marginTop: '1.6rem' }}>
          <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
            {t('termManagement.content')}
          </p>
          <Textarea
            placeholder={t('termManagement.contentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* 필수 여부 / 활성화 */}
        <div style={{ display: 'flex', gap: '3rem', marginTop: '1.6rem' }}>
          <div>
            <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
              {t('termManagement.requiredLabel')}
            </p>
            <ToggleSwitch
              checked={isRequired}
              onChange={() => setIsRequired((prev) => !prev)}
              label={isRequired ? t('termManagement.required') : t('termManagement.optional')}
            />
          </div>
          <div>
            <p className="typographyBody4" style={{ marginBottom: '1rem' }}>
              {t('termManagement.active')}
            </p>
            <ToggleSwitch
              checked={isActive}
              onChange={() => setIsActive((prev) => !prev)}
              label={isActive ? t('termManagement.active') : t('termManagement.inactive')}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ModalCreateTerm
