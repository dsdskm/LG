import { Input } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { InlineRow } from './styles'

const DEFAULT_LANG_CODE = 'default'

const CategoryNameInputs = ({ node, languages, disabled, onChange }) => {
  const { t } = useTranslation('settings')

  return (
    <>
      {(languages || []).map((lang) => {
        const isCommon = lang.langCode === DEFAULT_LANG_CODE
        const label = isCommon ? t('commonLanguage') : lang.displayName
        const entry = node.displayName?.[lang.id]
        return (
          <InlineRow key={lang.id}>
            <span className="lang">{label}</span>
            <div>
              <Input
                size="md"
                value={entry?.textScript || ''}
                disabled={disabled}
                onChange={(e) => onChange(lang.id, e.target.value)}
              />
            </div>
          </InlineRow>
        )
      })}
    </>
  )
}

export default CategoryNameInputs
