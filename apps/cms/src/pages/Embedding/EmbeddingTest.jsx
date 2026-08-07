import { useState, useEffect, useCallback, useRef } from 'react'
import {
  StyledPageContent,
  Section,
  Title,
  Button,
  Textarea,
  Dropdown,
  StyledTag,
  NoData
} from '@repo/ui'
import { toast } from 'react-toastify'
import { guardAction } from '@/utils/actionGuard'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrganizationStore } from '@repo/stores'
import { voiceQueryApis, languageApis, googleVoiceApis } from '@/apis'
import { resolveOrgIds } from '@/utils/org'
import { ButtonWrap, PageHeadWrap } from '@/components/common/styles'

const genSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}-${Date.now()}`

const EmbeddingTest = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('embedding')
  const { t: tCommon } = useTranslation('common')
  const { selectedOrgs, allOrgs } = useOrganizationStore()

  const [question, setQuestion] = useState('')
  const [languages, setLanguages] = useState([])
  const [languageId, setLanguageId] = useState(null)
  const [includeAudio, setIncludeAudio] = useState(false)
  const [voices, setVoices] = useState([])
  const [voiceCode, setVoiceCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(() => genSessionId())
  const [turns, setTurns] = useState([]) // [{ question, emotion, answer, grounded, contexts, audioContent, version, streaming }]

  // 문장 단위 프리젠터: 텍스트 노출 + 오디오 재생을 순서대로 동기 진행
  // queue: [{ text, audioContent?, emotion }]
  const presenterRef = useRef({ queue: [], playing: false, finished: false, turnIndex: null, lastEmotion: 'Normal' })

  const resetPresenter = useCallback((turnIndex = null) => {
    presenterRef.current = { queue: [], playing: false, finished: false, turnIndex, lastEmotion: 'Normal' }
  }, [])

  // 한 문장 텍스트를 해당 turn 답변에 노출
  const revealText = useCallback((turnIndex, text, emotion) => {
    setTurns((prev) => {
      const copy = [...prev]
      const cur = copy[turnIndex]
      if (cur) {
        copy[turnIndex] = {
          ...cur,
          emotion: emotion || cur.emotion,
          answer: cur.answer ? `${cur.answer} ${text}` : text
        }
      }
      return copy
    })
  }, [])

  const finishTurn = useCallback((turnIndex, emotion) => {
    setTurns((prev) => {
      const copy = [...prev]
      const cur = copy[turnIndex]
      if (cur) copy[turnIndex] = { ...cur, emotion: emotion || cur.emotion, streaming: false }
      return copy
    })
  }, [])

  // 큐에서 한 문장씩: 텍스트 노출 → 오디오 재생(또는 읽기 페이스 지연) → 다음
  const pump = useCallback(() => {
    const p = presenterRef.current
    if (p.playing) return
    const item = p.queue.shift()
    if (!item) {
      if (p.finished) finishTurn(p.turnIndex, p.lastEmotion)
      return
    }
    p.playing = true
    p.lastEmotion = item.emotion || p.lastEmotion
    revealText(p.turnIndex, item.text, item.emotion)

    const advance = () => {
      p.playing = false
      pump()
    }
    if (item.audioContent) {
      const audio = new Audio(`data:audio/mp3;base64,${item.audioContent}`)
      audio.onended = advance
      audio.onerror = advance
      audio.play().catch(advance)
    } else {
      const delay = Math.min(2000, 400 + (item.text?.length || 0) * 60)
      setTimeout(advance, delay)
    }
  }, [revealText, finishTurn])

  const enqueueItem = useCallback(
    (item) => {
      presenterRef.current.queue.push(item)
      pump()
    },
    [pump]
  )

  // 언어 목록 로드
  useEffect(() => {
    const load = async () => {
      try {
        const res = await languageApis.getLanguages()
        setLanguages(res?.results || [])
      } catch (error) {
        console.error('Failed to load languages:', error)
      }
    }
    load()
  }, [])

  // 선택 언어의 보이스 목록 로드
  useEffect(() => {
    if (!languageId) {
      setVoices([])
      setVoiceCode(null)
      return
    }
    const load = async () => {
      try {
        const res = await googleVoiceApis.getGoogleVoices({ languageId })
        const list = res?.results || []
        setVoices(list)
        // 해당 언어의 기본 보이스(isDefault) 자동 선택, 없으면 미선택
        const def = list.find((v) => v.isDefault)
        setVoiceCode(def ? def.voiceCode : null)
      } catch (error) {
        console.error('Failed to load voices:', error)
      }
    }
    load()
  }, [languageId])

  const selectedLanguage = languages.find((l) => l.id === languageId)
  const languageOptions = languages.map((l) => ({ name: l.displayName || l.langCode, value: l.id }))
  const voiceOptions = voices.map((v) => ({ name: v.voiceCode, value: v.voiceCode }))

  // '음성 포함' 체크 시 언어/보이스 미선택이면 질의 비활성
  const audioIncomplete = includeAudio && (!languageId || !voiceCode)

  const handleNewConversation = useCallback(() => {
    setSessionId(genSessionId())
    setTurns([])
    resetPresenter()
  }, [resetPresenter])

  const buildPayload = useCallback(
    (asked) => {
      const { groupId, siteId } = resolveOrgIds(selectedOrgs, allOrgs)
      const payload = { question: asked, sessionId }
      if (groupId) payload.groupId = groupId
      if (siteId) payload.siteId = siteId
      if (selectedLanguage) payload.langCode = selectedLanguage.langCode
      if (includeAudio && selectedLanguage && voiceCode) {
        payload.includeAudio = true
        payload.languageCode = selectedLanguage.googleTtsCode || selectedLanguage.langCode
        payload.voiceCode = voiceCode
      }
      return payload
    },
    [selectedOrgs, allOrgs, sessionId, selectedLanguage, includeAudio, voiceCode]
  )

  const handleSend = useCallback(async () => {
    if (!question.trim()) return
    const asked = question
    setLoading(true)
    setQuestion('')
    try {
      const payload = buildPayload(asked)

      if (streaming) {
        // 진행 중 turn 추가 + 프리젠터 초기화 → 이벤트마다 문장 큐에 push (텍스트/오디오 동기 노출)
        const turnIndex = turns.length
        resetPresenter(turnIndex)
        setTurns((prev) => [...prev, { question: asked, emotion: 'Normal', answer: '', streaming: true }])
        await voiceQueryApis.voiceQueryStream(payload, {
          onEvent: (ev) => {
            if (ev.error) {
              toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
            }
            if (ev.action) {
              // 액션 감지 결과를 해당 turn 에 반영
              setTurns((prev) => {
                const copy = [...prev]
                const cur = copy[turnIndex]
                if (cur) {
                  copy[turnIndex] = {
                    ...cur,
                    action: ev.action,
                    displayName: ev.displayName,
                    score: ev.score,
                    emotion: ev.emotion || cur.emotion,
                    streaming: false
                  }
                }
                return copy
              })
            }
            if (ev.text) {
              enqueueItem({ text: ev.text, audioContent: ev.audioContent, emotion: ev.emotion })
            }
            if (ev.isFinish) {
              presenterRef.current.finished = true
              if (ev.emotion) presenterRef.current.lastEmotion = ev.emotion
              pump()
            }
          }
        })
      } else {
        const res = await voiceQueryApis.voiceQuery(payload)
        const r = res?.results || {}
        setTurns((prev) => [...prev, { question: asked, ...r }])
      }
    } catch (error) {
      console.error('Failed to run voice query:', error)
      toast.error(tCommon('error', 'Error'), { autoClose: 2000 })
    } finally {
      setLoading(false)
    }
  }, [question, streaming, turns.length, buildPayload, resetPresenter, enqueueItem, pump, tCommon])

  return (
    <StyledPageContent className="column">
      <Title>
        {t('title', '음성대화 문서')} &gt; {t('test', '테스트')}
      </Title>
      <PageHeadWrap>
        <div />
        <ButtonWrap className="alignRight">
          <Button variant="outline" onClick={handleNewConversation} disabled={loading}>
            {t('newConversation', '새 대화')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/cms/embedding')}>
            {t('goDocuments', '문서 목록')}
          </Button>
        </ButtonWrap>
      </PageHeadWrap>

      <Section gap="1.6rem">
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Dropdown
            label={t('language', '언어')}
            size="lg"
            minWidth="180px"
            placeholder={t('selectLanguage', '언어 선택')}
            options={languageOptions}
            defaultValue={languageId}
            onChange={(v) => setLanguageId(v)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.8rem' }}>
            <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} />
            {t('includeAudio', '음성(TTS) 포함')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.8rem' }}>
            <input type="checkbox" checked={streaming} onChange={(e) => setStreaming(e.target.checked)} />
            {t('streaming', '스트리밍')}
          </label>
          {includeAudio && (
            <Dropdown
              label={t('voice', '보이스')}
              size="lg"
              minWidth="220px"
              placeholder={t('selectVoice', '보이스 선택')}
              options={voiceOptions}
              value={voiceCode}
              defaultValue={voiceCode}
              onChange={(v) => setVoiceCode(v)}
            />
          )}
        </div>

        <Textarea
          value={question}
          placeholder={t('enterQuestion', '질문을 입력하세요')}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <ButtonWrap className="alignRight" style={{ alignItems: 'center', gap: '0.8rem' }}>
          {audioIncomplete && (
            <span className="typographyBody6" style={{ color: 'var(--color-error, #d32f2f)' }}>
              {t('selectVoiceHint', '음성 포함 시 언어와 보이스를 선택하세요')}
            </span>
          )}
          <Button
            variant="contained"
            onClick={guardAction(handleSend, [
              { when: !question.trim(), message: t('enterQuestion', '질문을 입력하세요.') },
              { when: audioIncomplete, message: t('selectVoiceHint', '음성 포함 시 언어와 보이스를 선택하세요') }
            ])}
            disabled={loading}
          >
            {loading ? t('asking', '질의 중...') : t('ask', '질의')}
          </Button>
        </ButtonWrap>
      </Section>

      <Section gap="1.2rem">
        <div className="typographyBody4" style={{ fontWeight: 600 }}>
          {t('conversation', '대화')} ({turns.length})
        </div>
        {turns.length === 0 ? (
          <NoData>{tCommon('noData')}</NoData>
        ) : (
          turns.map((turn, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* 질문(user) */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                <div
                  style={{
                    padding: '0.8rem 1.2rem',
                    background: 'var(--color-primary-10, #eef3ff)',
                    borderRadius: '0.8rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {turn.question}
                </div>
              </div>

              {/* 답변(model) */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                  {turn.action ? (
                    <StyledTag>{t('actionDetected', '액션 감지')}</StyledTag>
                  ) : (
                    <>
                      <StyledTag>{turn.emotion}</StyledTag>
                      {turn.grounded !== undefined && (
                        <StyledTag>{turn.grounded ? t('grounded', '검색기반') : t('contextBased', '문서기반')}</StyledTag>
                      )}
                      {turn.version != null && <StyledTag>{`v${turn.version}`}</StyledTag>}
                    </>
                  )}
                  {turn.streaming && <StyledTag>…</StyledTag>}
                </div>
                {turn.action ? (
                  <div
                    style={{
                      padding: '0.8rem 1.2rem',
                      border: '1px solid var(--color-primary-40, #93b4ff)',
                      background: 'var(--color-primary-5, #f5f8ff)',
                      borderRadius: '0.8rem',
                      display: 'flex',
                      gap: '0.6rem',
                      alignItems: 'baseline',
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong>{turn.displayName || turn.action}</strong>
                    {turn.displayName && <span style={{ color: 'var(--color-neutral-60)' }}>{`(${turn.action})`}</span>}
                    {turn.score != null && (
                      <span style={{ color: 'var(--color-neutral-60)' }}>{`score ${turn.score}`}</span>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '0.8rem 1.2rem',
                      border: '1px solid var(--color-neutral-30, #ddd)',
                      borderRadius: '0.8rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6
                    }}
                  >
                    {turn.answer}
                  </div>
                )}
                {turn.audioContent && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio
                    controls
                    src={`data:audio/mp3;base64,${turn.audioContent}`}
                    style={{ width: '100%', marginTop: '0.6rem' }}
                  />
                )}
                {turn.contexts?.length > 0 && (
                  <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.2rem' }}>
                    {turn.contexts.map((c) => (
                      <li key={`${c.documentId}-${c.scriptId}`} style={{ color: 'var(--color-neutral-60)' }}>
                        <strong>{c.title}</strong>
                        {` (score ${c.score})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))
        )}
      </Section>
    </StyledPageContent>
  )
}

export default EmbeddingTest
