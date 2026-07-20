import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, Tab, JSONEditor } from '@repo/ui'
import MultiFileList from './MultiFileList'
import MultiTextList from './MultiTextList'
import TtsEditor from './TtsEditor'
import VideoPlayer from '@/components/common/VideoPlayer'
import { fileContentApis } from '@/apis'
import { EditorTwoCol, ContentCard, PreviewCard, CardTitle, PreviewBox } from '@/pages/Content/styles'

// 콘텐츠 타입(displayName 대문자) 별 입력 구성
const TYPE_INPUT = {
  IMAGE: { file: true, text: false },
  VIDEO: { file: true, text: false },
  AUDIO: { file: true, text: false },
  MOTION: { file: true, text: false },
  TTS: { file: true, text: true },
  TEXT: { file: false, text: true }
}

const ContentSubEditor = ({
  contentTypeName,
  languages,
  selectedLanguageId,
  onLanguageChange,
  subsByLang,
  onChange,
  accept,
  attributeHint,
  voicesByLang = {}
}) => {
  const { t } = useTranslation('content')

  const typeKey = (contentTypeName || '').toUpperCase()
  const isTts = typeKey === 'TTS'
  const isImage = typeKey === 'IMAGE'
  const isVideo = typeKey === 'VIDEO'
  const isAudio = typeKey === 'AUDIO'
  const isMotion = typeKey === 'MOTION'
  const inputCfg = TYPE_INPUT[typeKey] || { file: true, text: false }
  const cur = subsByLang[selectedLanguageId] || { files: [], texts: [] }

  const setFiles = (files) => onChange(selectedLanguageId, { ...cur, files })
  const setTexts = (texts) => onChange(selectedLanguageId, { ...cur, texts })
  const setFilesAndTexts = (files, texts) => onChange(selectedLanguageId, { ...cur, files, texts })

  const langCode = (languages || []).find((l) => l.id === selectedLanguageId)?.langCode
  const voices = voicesByLang[selectedLanguageId] || []
  const textLabel = isTts ? t('ttsScript') : t('textScript')

  // TTS는 언어별 voice 선택이 필요하므로 공통(default) 언어탭은 미제공
  const tabLanguages = useMemo(
    () => (isTts ? (languages || []).filter((l) => l.langCode !== 'default') : languages || []),
    [isTts, languages]
  )

  // 현재 선택이 노출 탭에 없으면(예: TTS에서 공통이 숨겨짐) 첫 노출 탭으로 보정
  useEffect(() => {
    if (tabLanguages.length === 0) return
    if (!tabLanguages.some((l) => l.id === selectedLanguageId)) {
      onLanguageChange(tabLanguages[0].id)
    }
  }, [tabLanguages, selectedLanguageId, onLanguageChange])

  // ---- 미리보기(선택 파일) ----
  const [selectedFileUid, setSelectedFileUid] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)

  const selectedRow = cur.files.find((f) => f.uid === selectedFileUid) || cur.files[0] || null

  // 파일 목록 변경 시 선택 기본값 보정
  useEffect(() => {
    if (cur.files.length === 0) {
      setSelectedFileUid(null)
    } else if (!cur.files.some((f) => f.uid === selectedFileUid)) {
      setSelectedFileUid(cur.files[0].uid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.files, selectedLanguageId])

  // 신규 파일 → blob 미리보기
  useEffect(() => {
    if (selectedRow?.file) {
      const url = URL.createObjectURL(selectedRow.file)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setBlobUrl(null)
    return undefined
  }, [selectedRow?.file])

  // 기존 파일 → signed URL 미리보기
  useEffect(() => {
    let active = true
    if (!selectedRow?.file && selectedRow?.id) {
      fileContentApis
        .requestDownloadUrlById({ fileContentId: selectedRow.id })
        .then((r) => {
          if (active) setSignedUrl(r?.results || null)
        })
        .catch(() => {
          if (active) setSignedUrl(null)
        })
    } else {
      setSignedUrl(null)
    }
    return () => {
      active = false
    }
  }, [selectedRow?.id, selectedRow?.file])

  const previewSrc = blobUrl || signedUrl

  // MOTION(JSON) 미리보기: previewSrc(blob/signed URL) 텍스트 로드 후 pretty-print
  const [jsonText, setJsonText] = useState('')
  useEffect(() => {
    if (!isMotion || !previewSrc) {
      setJsonText('')
      return undefined
    }
    let active = true
    fetch(previewSrc)
      .then((r) => r.text())
      .then((txt) => {
        if (!active) return
        try {
          setJsonText(JSON.stringify(JSON.parse(txt), null, 2))
        } catch {
          setJsonText(txt)
        }
      })
      .catch(() => active && setJsonText(''))
    return () => {
      active = false
    }
  }, [isMotion, previewSrc])

  const langLabel = (l) => (l.langCode === 'default' ? t('commonLanguage', '공통') : l.displayName)

  const renderEditor = () => {
    if (isTts) {
      return <TtsEditor langCode={langCode} voices={voices} files={cur.files} texts={cur.texts} onChange={setFilesAndTexts} />
    }
    return (
      <>
        {inputCfg.file && (
          <MultiFileList
            files={cur.files}
            accept={accept}
            attributeHint={attributeHint}
            selectedUid={selectedRow?.uid}
            onChange={setFiles}
            onSelect={setSelectedFileUid}
          />
        )}
        {inputCfg.text && (
          <div style={{ marginTop: inputCfg.file ? '1.6rem' : 0 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.6rem' }}>{textLabel}</div>
            <MultiTextList texts={cur.texts} placeholder={textLabel} onChange={setTexts} />
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      {/* 언어 탭 */}
      <Tabs activeId={selectedLanguageId} onChange={onLanguageChange}>
        {tabLanguages.map((l) => (
          <Tab key={l.id} id={l.id} label={langLabel(l)} />
        ))}
      </Tabs>

      {inputCfg.file && !isTts ? (
        <EditorTwoCol>
          <ContentCard>
            <CardTitle>{t(contentTypeName || 'contentFile')}</CardTitle>
            {renderEditor()}
          </ContentCard>
          <PreviewCard>
            <CardTitle>{t('preview', '미리보기')}</CardTitle>
            <PreviewBox>
              {!previewSrc ? (
                <span className="placeholder">{t('preview', '미리보기')}</span>
              ) : isImage ? (
                <img src={previewSrc} alt="preview" />
              ) : isVideo ? (
                <VideoPlayer file={previewSrc} />
              ) : isAudio ? (
                <audio src={previewSrc} controls />
              ) : isMotion ? (
                jsonText ? (
                  <div style={{ width: '100%' }}>
                    <JSONEditor value={jsonText} disabled height="24rem" />
                  </div>
                ) : (
                  <span className="placeholder">{selectedRow?.file?.name || selectedRow?.fileName || ''}</span>
                )
              ) : (
                <span className="placeholder">{selectedRow?.file?.name || selectedRow?.fileName || ''}</span>
              )}
            </PreviewBox>
          </PreviewCard>
        </EditorTwoCol>
      ) : (
        <ContentCard>
          <CardTitle>{t(contentTypeName || 'contentFile')}</CardTitle>
          {renderEditor()}
        </ContentCard>
      )}
    </div>
  )
}

export default ContentSubEditor
