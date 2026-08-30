import { useEffect, useState } from 'react'
import { Dropdown, Input, JSONEditor, TextFieldInfo } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const JSONPreview = ({ supportedTypeList, src, selectedLanguage, contentFile, setContentFile }) => {
  const [jsonStr, setJsonStr] = useState('')
  const { t } = useTranslation('common')

  useEffect(() => {
    const file = contentFile?.[selectedLanguage]
    if (file instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result)
          setJsonStr(JSON.stringify(json, null, 2))
        } catch (err) {
          setJsonStr(e.target.result)
        }
      }
      reader.readAsText(file)
    } else if (src) {
      fetch(src)
        .then((res) => res.json())
        .then((data) => setJsonStr(JSON.stringify(data, null, 2)))
        .catch((err) => console.error('Error fetching JSON src:', err))
    } else {
      setJsonStr('')
    }
  }, [contentFile, selectedLanguage, src])

  return (
    <>
      <Input
        type="file"
        label={t('contentFile')}
        size="sm"
        value={contentFile?.[selectedLanguage]?.name || contentFile?.[selectedLanguage]?.fileName || ''}
        onChange={(e) => setContentFile({ ...contentFile, [selectedLanguage]: e.target?.files[0] })}
        onReset={() => setContentFile({ ...contentFile, [selectedLanguage]: null })}
      />
      <div style={{ marginLeft: '2rem', gap: '2rem', display: 'flex', flexDirection: 'column' }}>
        <label>
          {t('supportedType')} : {supportedTypeList?.join(', ')}
        </label>
        <TextFieldInfo
          label={t('contentFileName')}
          value={contentFile?.[selectedLanguage]?.name || contentFile?.[selectedLanguage]?.fileName || ''}
        />
      </div>
      <JSONEditor label={'JSON'} value={jsonStr} onChange={setJsonStr} height="40rem" />
    </>
  )
}

export default JSONPreview
