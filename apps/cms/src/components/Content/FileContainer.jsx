import React, { useEffect, useState } from 'react'
import { ImagePreview, VideoPreview, AudioPreview, TextPreview, JSONPreview, TTSPreview } from '@/components/Content'
import { useTranslation } from 'react-i18next'

const FileContainer = ({
  selectedContentType,
  supportedTypeList,
  contentFile,
  setContentFile,
  selectedLanguage,
  languageOptions,
  onLanguageChange,
  id
}) => {
  const { t } = useTranslation('content')

  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!contentFile[selectedLanguage]) {
      setPreviewUrl('')
      return
    }

    const url = URL.createObjectURL(contentFile[selectedLanguage])
    setPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [contentFile, selectedLanguage])

  return (
    <>
      {selectedContentType === 'image' && (
        <ImagePreview
          supportedTypeList={supportedTypeList}
          src={previewUrl || '/cms/assets/img/img_ph.png'}
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          handleLanguageChange={onLanguageChange}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
      {selectedContentType === 'video' && (
        <VideoPreview
          supportedTypeList={supportedTypeList}
          src={previewUrl}
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          handleLanguageChange={onLanguageChange}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
      {selectedContentType === 'audio' && (
        <AudioPreview
          supportedTypeList={supportedTypeList}
          src={previewUrl}
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          handleLanguageChange={onLanguageChange}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
      {selectedContentType === 'text' && (
        <TextPreview
          supportedTypeList={supportedTypeList}
          src={previewUrl}
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          handleLanguageChange={onLanguageChange}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
      {selectedContentType === 'motion' && (
        <JSONPreview
          supportedTypeList={supportedTypeList}
          src={previewUrl}
          selectedLanguage={'default'}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
      {selectedContentType === 'tts' && (
        <TTSPreview
          supportedTypeList={supportedTypeList}
          src={previewUrl}
          languageOptions={languageOptions}
          selectedLanguage={selectedLanguage}
          handleLanguageChange={onLanguageChange}
          contentFile={contentFile}
          setContentFile={setContentFile}
        />
      )}
    </>
  )
}

export default FileContainer
