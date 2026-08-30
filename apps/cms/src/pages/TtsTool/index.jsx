import { useState, useEffect, useMemo } from 'react'
import { StyledPageContent, Title, Section, Dropdown, Textarea, Button } from '@repo/ui'
import { languageApis, googleVoiceApis } from '@/apis'
import { guardAction } from '@/utils/actionGuard'
import { STORAGE_KEYS, getPref, setPref, removePref } from '@/utils/storage'

const MAX_TEXT = 1000

// base64 → Blob (mp3 다운로드용)
const base64ToBlob = (base64, type = 'audio/mpeg') => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

// 텍스트→TTS 변환, 미리듣기, mp3 다운로드 도구
const TtsTool = () => {
  const [languages, setLanguages] = useState([])
  const [voicesByLang, setVoicesByLang] = useState({}) // { [languageId]: [voice] }

  const [languageId, setLanguageId] = useState(null)
  const [voiceCode, setVoiceCode] = useState(null)
  const [text, setText] = useState('')

  const [loading, setLoading] = useState(false)
  const [audioB64, setAudioB64] = useState(null)

  // 언어/목소리 목록 로드 (langCode 'default'/빈값 언어는 TTS 대상에서 제외)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [langRes, voiceRes] = await Promise.all([languageApis.getLanguages(), googleVoiceApis.getGoogleVoices()])
        const langs = (langRes?.results || []).filter((l) => l.langCode && l.langCode !== 'default')
        setLanguages(langs)

        const map = {}
        for (const v of voiceRes?.results || []) {
          if (!map[v.languageId]) map[v.languageId] = []
          map[v.languageId].push(v)
        }
        setVoicesByLang(map)

        if (langs.length > 0) {
          // 저장값 복원 (유효하지 않으면 첫 항목 폴백)
          const savedLangId = getPref(STORAGE_KEYS.TTS_LANGUAGE_ID)
          const lang = langs.find((l) => l.id === savedLangId) || langs[0]
          const langVoices = map[lang.id] || []
          const savedVoice = getPref(STORAGE_KEYS.TTS_VOICE_CODE)
          const voice = langVoices.find((v) => v.voiceCode === savedVoice) || langVoices[0]
          setLanguageId(lang.id)
          setVoiceCode(voice?.voiceCode ?? null)
        }
      } catch (error) {
        console.error('Failed to load TTS options:', error)
      }
    }
    fetchData()
  }, [])

  const languageOptions = useMemo(
    () => languages.map((l) => ({ value: l.id, name: l.displayName })),
    [languages],
  )
  const voiceOptions = useMemo(
    () => (voicesByLang[languageId] || []).map((v) => ({ value: v.voiceCode, name: v.displayName })),
    [voicesByLang, languageId],
  )

  const handleLanguageChange = (val) => {
    const firstVoice = voicesByLang[val]?.[0]?.voiceCode ?? null
    setLanguageId(val)
    setVoiceCode(firstVoice)
    setAudioB64(null)
    setPref(STORAGE_KEYS.TTS_LANGUAGE_ID, val)
    if (firstVoice) setPref(STORAGE_KEYS.TTS_VOICE_CODE, firstVoice)
    else removePref(STORAGE_KEYS.TTS_VOICE_CODE)
  }

  const handleVoiceChange = (val) => {
    setVoiceCode(val)
    setAudioB64(null)
    setPref(STORAGE_KEYS.TTS_VOICE_CODE, val)
  }

  const currentLang = languages.find((l) => l.id === languageId)
  const languageCode = currentLang?.googleTtsCode || currentLang?.langCode
  const tooLong = text.length > MAX_TEXT
  const canConvert = !!text.trim() && !tooLong && !!voiceCode && !!languageCode && !loading

  const handleConvert = async () => {
    if (!canConvert) return
    setLoading(true)
    setAudioB64(null)
    try {
      const res = await googleVoiceApis.synthesizeTts({ text, languageCode, voiceCode })
      const b64 = res?.results?.audioContent
      if (b64) setAudioB64(b64)
    } catch (error) {
      console.error('Failed to synthesize TTS:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!audioB64) return
    const blob = base64ToBlob(audioB64)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tts_${languageCode || 'audio'}_${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <StyledPageContent className="column">
      <Title>TTS 변환</Title>
      <Section gap="1.6rem">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', alignItems: 'flex-end' }}>
          <Dropdown
            label="언어"
            size="md"
            minWidth="200px"
            value={languageId}
            placeholder="언어 선택"
            options={languageOptions}
            onChange={handleLanguageChange}
          />
          <Dropdown
            label="목소리"
            size="md"
            minWidth="220px"
            value={voiceCode}
            placeholder="목소리 선택"
            options={voiceOptions}
            onChange={handleVoiceChange}
          />
        </div>

        <Textarea
          label="텍스트"
          size="lg"
          maxLength={MAX_TEXT}
          count
          value={text}
          placeholder="변환할 텍스트를 입력하세요 (최대 1000자)"
          isError={tooLong}
          message={tooLong ? '최대 1000자까지 입력할 수 있습니다.' : ''}
          onChange={(e) => setText(e.target.value)}
        />

        <div>
          <Button
            variant="contained"
            disabled={loading}
            onClick={guardAction(handleConvert, [
              { when: !text.trim(), message: '텍스트를 입력하세요.' },
              { when: tooLong, message: '최대 1000자까지 입력할 수 있습니다.' },
              { when: !languageCode, message: '언어를 선택하세요.' },
              { when: !voiceCode, message: '목소리를 선택하세요.' }
            ])}
          >
            {loading ? '변환 중…' : '변환'}
          </Button>
        </div>

        {audioB64 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <audio controls src={`data:audio/mpeg;base64,${audioB64}`} style={{ width: '100%', maxWidth: '48rem' }} />
            <div>
              <Button variant="outline" onClick={handleDownload}>
                MP3 다운로드
              </Button>
            </div>
          </div>
        )}
      </Section>
    </StyledPageContent>
  )
}

export default TtsTool
