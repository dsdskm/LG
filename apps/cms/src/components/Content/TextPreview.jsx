import { useEffect, useState } from 'react'
import { Dropdown, Textarea } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const TextPreview = ({
  supportedTypeList,
  src,
  languageOptions,
  selectedLanguage,
  handleLanguageChange,
  contentFile,
  setContentFile
}) => {
  const [text, setText] = useState('')
  const { t } = useTranslation('common')

  useEffect(() => {
    if (src) {
      fetch(src).then((res) => {
        if (res.ok) {
          res.text().then((data) => setText(data))
        }
      })
    }
  }, [src])

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
      <Textarea
        label={t('contentFile')}
        size="lg"
        value={text}
        disabled={true}
        placeholder={t('enterContent')}
        readOnly={true}
      />
    </>
  )
}

export default TextPreview
