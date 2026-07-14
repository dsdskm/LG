import { useState, useEffect } from 'react'
import { StyledPageContent, Section, Title, Button, Input, Textarea, Dropdown, IconButton } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrganizationStore } from '@repo/stores'
import { toast } from 'react-toastify'
import { robotActionApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Math.random().toString(36).slice(2)}-${Date.now()}`

const RobotActionDetail = () => {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { selectedOrgs, allOrgs } = useOrganizationStore()

  const [displayName, setDisplayName] = useState('')
  const [actionCode, setActionCode] = useState(null)
  const [codes, setCodes] = useState([])
  const [phrases, setPhrases] = useState([]) // [{ uid, id?, script }]
  const [saving, setSaving] = useState(false)

  // 액션 코드 목록
  useEffect(() => {
    const load = async () => {
      try {
        const res = await robotActionApis.getRobotActionCodes()
        setCodes(res?.results || [])
      } catch (error) {
        console.error('Failed to load action codes:', error)
      }
    }
    load()
  }, [])

  // 편집 시 기존 로드
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res = await robotActionApis.getRobotActions({ id })
        const action = (res?.results || [])[0]
        if (action) {
          setDisplayName(action.displayName || '')
          setActionCode(action.actionCode || null)
          setPhrases((action.scripts || []).map((s) => ({ uid: genUid(), id: s.id, script: s.script || '' })))
        }
      } catch (error) {
        console.error('Failed to load robot action:', error)
      }
    }
    load()
  }, [id])

  const codeOptions = codes.map((c) => ({
    name: c.displayName ? `${c.displayName} (${c.code})` : c.code,
    value: c.code
  }))

  const addPhrase = () => setPhrases((prev) => [...prev, { uid: genUid(), script: '' }])
  const updatePhrase = (uid, value) => setPhrases((prev) => prev.map((p) => (p.uid === uid ? { ...p, script: value } : p)))
  const removePhrase = (uid) => setPhrases((prev) => prev.filter((p) => p.uid !== uid))

  const isDisabled = () => !displayName.trim() || !actionCode || saving

  const handleSave = async () => {
    const scriptList = phrases
      .filter((p) => (p.script || '').trim())
      .map((p) => ({ ...(p.id ? { id: p.id } : {}), script: p.script }))
    setSaving(true)
    try {
      if (isEdit) {
        await robotActionApis.updateRobotAction({ id: Number(id), displayName, actionCode, scriptList })
      } else {
        const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
        await robotActionApis.createRobotAction({ displayName, actionCode, groupId, siteId, scriptList })
      }
      toast.success(tCommon('success', 'Success'), { autoClose: 2000 })
      navigate('/cms/embedding/actions')
    } catch (error) {
      console.error('Failed to save robot action:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
      setSaving(false)
    }
  }

  const handleCancel = () => navigate('/cms/embedding/actions')

  return (
    <StyledPageContent className="column">
      <Title>
        {t('robotActionTitle', '로봇액션')} &gt; {tCommon('detail', '상세')}
      </Title>
      <PageHeadWrap>
        <div />
        <ButtonWrap className="alignRight">
          <Button variant="contained" onClick={handleSave} disabled={isDisabled()}>
            {t(isEdit ? 'modify' : 'create')}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {tCommon('cancel')}
          </Button>
        </ButtonWrap>
      </PageHeadWrap>

      <Section gap="2.4rem">
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Dropdown
            label={t('actionCode', '액션 코드')}
            size="lg"
            minWidth="240px"
            placeholder={t('selectActionCode', '액션 코드 선택')}
            options={codeOptions}
            defaultValue={actionCode}
            value={actionCode}
            onChange={(v) => setActionCode(v)}
          />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              label={t('actionName', '액션 이름')}
              size="lg"
              placeholder={t('enterActionName', '액션 이름을 입력하세요')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <Section gap="1rem">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
            <span className="typographyBody4" style={{ fontWeight: 600 }}>
              {t('recognitionPhrase', '인식 발화')} ({phrases.length})
            </span>
            <ButtonWrap>
              <Button variant="contained" onClick={addPhrase}>
                {t('addPhrase', '발화 추가')}
              </Button>
            </ButtonWrap>
          </div>

          {phrases.map((p, index) => (
            <div key={p.uid} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
              <span style={{ minWidth: '2.4rem', paddingTop: '1rem', color: 'var(--color-neutral-60)' }}>{index + 1}</span>
              <div style={{ flex: 1 }}>
                <Textarea
                  value={p.script}
                  placeholder={t('enterPhrase', '인식 발화를 입력하세요')}
                  onChange={(e) => updatePhrase(p.uid, e.target.value)}
                />
              </div>
              <IconButton
                type="button"
                name="close"
                size="xs"
                shape="square"
                theme="outlined"
                aria-label="remove"
                onClick={() => removePhrase(p.uid)}
              />
            </div>
          ))}
        </Section>
      </Section>
    </StyledPageContent>
  )
}

export default RobotActionDetail
