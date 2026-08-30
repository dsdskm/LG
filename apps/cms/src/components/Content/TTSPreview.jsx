import AudioPlayer from '@/components/common/AudioPlayer'
import { Button, Textarea, Dropdown } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const TTSPreview = ({
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
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Dropdown
          label={t('language')}
          size="lg"
          value={selectedLanguage}
          onChange={handleLanguageChange}
          options={languageOptions}
        />
      </div>
      {ttsData.map((data, index) => (
        <>
          <Textarea
            label={t('text')}
            size="lg"
            value={data.text[selectedLanguage]}
            onChange={(e) => handleTextChange(e, index)}
          />
          <AudioPlayer
            src={data.audioUrl[selectedLanguage]}
            language={selectedLanguage}
            label={t('contentFile')}
            playButtonText={t('play')}
            pauseButtonText={t('pause')}
          />
          <Button>위 추가</Button>
          <Button>아래 추가</Button>
          <Button>제거</Button>
          <Button>생성</Button>
        </>
      ))}
    </>
  )
}

export default TTSPreview
