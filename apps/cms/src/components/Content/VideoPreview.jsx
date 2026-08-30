import { Dropdown, Input } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { StyledPreviewBox } from './styles'

const VideoPreview = ({
  supportedTypeList,
  src,
  languageOptions,
  selectedLanguage,
  handleLanguageChange,
  contentFile,
  setContentFile
}) => {
  const { t } = useTranslation('common')

  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <Dropdown
          label={t('language')}
          size="lg"
          value={selectedLanguage}
          onChange={handleLanguageChange}
          options={languageOptions}
        />
        <Input
          type="file"
          label={t('contentFile')}
          size="sm"
          value={contentFile?.[selectedLanguage]?.name || contentFile?.[selectedLanguage]?.fileName || ''}
          onChange={(e) => setContentFile({ ...contentFile, [selectedLanguage]: e.target?.files[0] })}
          onReset={() => setContentFile({ ...contentFile, [selectedLanguage]: null })}
        />
      </div>
      <StyledPreviewBox>
        <video src={src} controls style={{ maxWidth: '100%', maxHeight: '30rem' }}></video>
      </StyledPreviewBox>
    </>
  )
}

export default VideoPreview
