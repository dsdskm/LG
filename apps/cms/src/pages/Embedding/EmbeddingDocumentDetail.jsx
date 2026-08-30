import { useState, useEffect, useRef } from 'react'
import { StyledPageContent, Section, Title, Button, Input, Textarea, IconButton } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrganizationStore } from '@repo/stores'
import { toast } from 'react-toastify'
import { embeddingApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { guardAction } from '@/utils/actionGuard'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Math.random().toString(36).slice(2)}-${Date.now()}`

const EmbeddingDocumentDetail = () => {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { selectedOrgs, allOrgs } = useOrganizationStore()

  const [displayName, setDisplayName] = useState('')
  const [paragraphs, setParagraphs] = useState([]) // [{ uid, id?, script }]
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res = await embeddingApis.getEmbeddingDocuments({ id })
        const doc = (res?.results || [])[0]
        if (doc) {
          setDisplayName(doc.displayName || '')
          setParagraphs((doc.scripts || []).map((s) => ({ uid: genUid(), id: s.id, script: s.script || '' })))
        }
      } catch (error) {
        console.error('Failed to load embedding document:', error)
      }
    }
    load()
  }, [id])

  const addParagraph = () => setParagraphs((prev) => [...prev, { uid: genUid(), script: '' }])
  const updateParagraph = (uid, value) =>
    setParagraphs((prev) => prev.map((p) => (p.uid === uid ? { ...p, script: value } : p)))
  const removeParagraph = (uid) => setParagraphs((prev) => prev.filter((p) => p.uid !== uid))

  // TXT 업로드 → 빈 줄 기준으로 단락 분할 후 추가
  const handleTxtUpload = (e) => {
    const file = e.target?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const parts = text
        .split(/\r?\n\s*\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.length > 0) {
        setParagraphs((prev) => [...prev, ...parts.map((s) => ({ uid: genUid(), script: s }))])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const isDisabled = () => !displayName.trim() || saving

  const handleSave = async () => {
    const scriptList = paragraphs
      .filter((p) => (p.script || '').trim())
      .map((p) => ({ ...(p.id ? { id: p.id } : {}), script: p.script }))
    setSaving(true)
    try {
      if (isEdit) {
        await embeddingApis.updateEmbeddingDocument({ id: Number(id), displayName, scriptList })
      } else {
        const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
        await embeddingApis.createEmbeddingDocument({ displayName, groupId, siteId, scriptList })
      }
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      navigate('/cms/embedding')
    } catch (error) {
      console.error('Failed to save embedding document:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      setSaving(false)
    }
  }

  const handleCancel = () => navigate('/cms/embedding')

  return (
    <StyledPageContent className="column">
      <Title>
        {t('title', '음성대화 문서')} &gt; {tCommon('detail', '상세')}
      </Title>
      <PageHeadWrap>
        <div />
        <ButtonWrap className="alignRight">
          <Button
            variant="contained"
            onClick={guardAction(handleSave, [{ when: !displayName.trim(), message: '제목을 입력하세요.' }])}
            disabled={saving}
          >
            {t(isEdit ? 'modify' : 'create')}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {tCommon('cancel')}
          </Button>
        </ButtonWrap>
      </PageHeadWrap>

      <Section gap="2.4rem">
        <Input
          label={t('documentName', '문서 이름')}
          size="lg"
          placeholder={t('enterDocumentName', '문서 이름을 입력하세요')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <Section gap="1rem">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
            <span className="typographyBody4" style={{ fontWeight: 600 }}>
              {t('paragraph', '단락')} ({paragraphs.length})
            </span>
            <ButtonWrap>
              <input ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleTxtUpload} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                {t('uploadTxt', 'TXT 업로드')}
              </Button>
              <Button variant="contained" onClick={addParagraph}>
                {t('addParagraph', '단락 추가')}
              </Button>
            </ButtonWrap>
          </div>

          {paragraphs.map((p, index) => (
            <div key={p.uid} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ minWidth: '2.4rem', paddingTop: '1rem', color: 'var(--color-neutral-60)' }}>{index + 1}</span>
              <div style={{ flex: 1 }}>
                <Textarea
                  value={p.script}
                  placeholder={t('enterParagraph', '단락 텍스트를 입력하세요')}
                  onChange={(e) => updateParagraph(p.uid, e.target.value)}
                />
              </div>
              <IconButton
                type="button"
                name="close"
                size="xs"
                shape="square"
                theme="outlined"
                aria-label="remove"
                onClick={() => removeParagraph(p.uid)}
              />
            </div>
          ))}
        </Section>
      </Section>
    </StyledPageContent>
  )
}

export default EmbeddingDocumentDetail
