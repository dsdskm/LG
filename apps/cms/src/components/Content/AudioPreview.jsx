import { useState } from 'react'
import { Dropdown, Button, Input, TextFieldInfo } from '@repo/ui'
import { DropdownContainer } from '@/components/common/styles'
import { useTranslation } from 'react-i18next'

const AudioPreview = ({
  supportedTypeList,
  src,
  languageOptions,
  selectedLanguage,
  handleLanguageChange,
  setContentFile,
  contentFile
}) => {
  const { t } = useTranslation('common')
  return (
    <>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <Dropdown
          label={t('language')}
          size="lg"
          value={selectedLanguage}
          defaultValue={selectedLanguage}
          options={languageOptions}
          onChange={handleLanguageChange}
          minWidth="200px"
        />
        {/* <Button>{t('syncAllLanguages')}</Button> */}
        <Input
          type="file"
          label={t('contentFile')}
          size="sm"
          value={contentFile?.[selectedLanguage]?.name || contentFile?.[selectedLanguage]?.fileName || ''}
          onChange={(e) => setContentFile({ ...contentFile, [selectedLanguage]: e.target?.files[0] })}
          onReset={() => setContentFile({ ...contentFile, [selectedLanguage]: null })}
        />
      </div>
      <div style={{ marginLeft: '2rem' }}>
        <label>
          {t('supportedType')} : {supportedTypeList?.join(', ')}
        </label>
        <TextFieldInfo
          label={t('contentFileName')}
          value={contentFile?.[selectedLanguage]?.name || contentFile?.[selectedLanguage]?.fileName || ''}
        />
      </div>
      <div style={{ display: 'flex', marginTop: '1rem' }}>
        <audio src={src} controls></audio>
      </div>
    </>
  )
}

export default AudioPreview
