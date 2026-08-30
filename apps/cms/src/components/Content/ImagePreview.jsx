import { StyledPreviewBox } from './styles'
import { Dropdown, Input } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const IMG_PLACEHOLDER_SRC = '/cms/assets/img/img_ph.png'
const ImagePreview = ({
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
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
      {src && (
        <StyledPreviewBox>
          <img
            src={src || IMG_PLACEHOLDER_SRC}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = IMG_PLACEHOLDER_SRC
            }}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '30rem' }}
          />
        </StyledPreviewBox>
      )}
    </>
  )
}

export default ImagePreview
