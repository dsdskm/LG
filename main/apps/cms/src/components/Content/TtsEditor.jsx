import { useState, useEffect } from 'react'
import { Button, Textarea, Dropdown } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { googleVoiceApis, fileContentApis } from '@/apis'

const MAX_SCRIPT = 1000

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tts-${Math.random().toString(36).slice(2)}-${Date.now()}`

// base64 mp3 → File
const base64ToFile = (base64, fileName) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: 'audio/mp3' })
}

/**
 * 언어별 TTS 에디터. files[i] / texts[i] 를 페어로 관리한다.
 * - files[i] = { uid, id?, file, fileName, fileSize, fileType, voiceCode(transient) }
 * - texts[i] = { uid, id?, textScript }
 * voiceCode 는 합성용 transient 값(저장 페이로드엔 미반영).
 */
const TtsEditor = ({ langCode, voices, files, texts, onChange }) => {
  const { t } = useTranslation('content')
  const [generatingIdx, setGeneratingIdx] = useState(null)
  const [previews, setPreviews] = useState({}) // { [uid]: audioUrl }

  const voiceOptions = (voices || []).map((v) => ({ value: v.voiceCode, name: v.displayName }))
  const count = Math.max(files.length, texts.length)
  const entries = Array.from({ length: count }, (_, i) => ({
    file: files[i] || { uid: genUid(), file: null },
    text: texts[i] || { uid: genUid(), textScript: '' }
  }))

  // 기존(수정) 항목: 저장된 mp3 미리듣기용 signed URL 조회 (베스트에포트)
  useEffect(() => {
    files.forEach((f) => {
      if (f?.id && !f.file && !previews[f.uid]) {
        fileContentApis
          .requestDownloadUrlById({ fileContentId: f.id })
          .then((r) => {
            const url = r?.results
            if (url) setPreviews((p) => ({ ...p, [f.uid]: url }))
          })
          .catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const setVoice = (i, voiceCode) => {
    onChange(
      files.map((f, idx) => (idx === i ? { ...f, voiceCode } : f)),
      texts
    )
  }

  const setScript = (i, value) => {
    const next = value.slice(0, MAX_SCRIPT)
    onChange(
      files,
      texts.map((tx, idx) => (idx === i ? { ...tx, textScript: next } : tx))
    )
  }

  const addEntry = () => {
    onChange(
      [...files, { uid: genUid(), file: null, voiceCode: voices?.[0]?.voiceCode || '' }],
      [...texts, { uid: genUid(), textScript: '' }]
    )
  }

  const removeEntry = (i) => {
    onChange(
      files.filter((_, idx) => idx !== i),
      texts.filter((_, idx) => idx !== i)
    )
  }

  const handleGenerate = async (i) => {
    const script = texts[i]?.textScript || ''
    const voiceCode = files[i]?.voiceCode || voices?.[0]?.voiceCode
    if (!script.trim() || !voiceCode) return
    setGeneratingIdx(i)
    try {
      const res = await googleVoiceApis.synthesizeTts({ text: script, languageCode: langCode, voiceCode })
      const base64 = res?.results?.audioContent
      if (!base64) throw new Error('no audio content')
      const fileName = `tts_${langCode}_${i}.mp3`
      const file = base64ToFile(base64, fileName)
      const uid = files[i]?.uid || genUid()
      onChange(
        files.map((f, idx) => (idx === i ? { ...f, uid, file, fileName, fileSize: file.size, fileType: 'TTS' } : f)),
        texts
      )
      setPreviews((p) => ({ ...p, [uid]: `data:audio/mp3;base64,${base64}` }))
    } catch (error) {
      console.error('TTS synthesize failed:', error)
      toast.error(t('ttsGenerateFailed', 'TTS 생성에 실패했습니다'), { autoClose: 2000 })
    } finally {
      setGeneratingIdx(null)
    }
  }

  return (
    <div>
      {entries.map((entry, i) => {
        const script = entry.text.textScript || ''
        const voiceCode = entry.file.voiceCode || voices?.[0]?.voiceCode || ''
        const previewUrl = previews[entry.file.uid]
        return (
          <div
            key={entry.file.uid}
            style={{ border: '1px solid #eceff3', borderRadius: 8, padding: '1.4rem', marginBottom: '1.2rem' }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <Dropdown
                label={t('voice', '목소리')}
                size="md"
                minWidth="200px"
                value={voiceCode}
                placeholder={t('selectVoice', '목소리 선택')}
                options={voiceOptions}
                onChange={(val) => setVoice(i, val)}
              />
              <Button
                size="md"
                onClick={() => handleGenerate(i)}
                disabled={!script.trim() || !voiceCode || generatingIdx === i}
              >
                {generatingIdx === i ? t('generating', '생성 중...') : t('generate', '생성')}
              </Button>
              <Button size="md" theme="delete" onClick={() => removeEntry(i)}>
                {t('removeItem', '삭제')}
              </Button>
            </div>

            <Textarea
              label={t('ttsScript', 'TTS 스크립트')}
              size="lg"
              maxLength={MAX_SCRIPT}
              value={script}
              onChange={(e) => setScript(i, e.target.value)}
            />
            <div style={{ textAlign: 'right', fontSize: '1.2rem', color: '#8a94a0', marginTop: '0.4rem' }}>
              {script.length}/{MAX_SCRIPT}
            </div>

            {previewUrl && (
              <audio controls src={previewUrl} style={{ width: '100%', marginTop: '0.8rem' }}>
                <track kind="captions" />
              </audio>
            )}
          </div>
        )
      })}

      <Button size="sm" theme="secondary" onClick={addEntry}>
        + {t('addText', '추가')}
      </Button>
    </div>
  )
}

export default TtsEditor
