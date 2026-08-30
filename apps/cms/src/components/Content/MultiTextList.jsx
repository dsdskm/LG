import { Textarea, Button } from '@repo/ui'
import { useTranslation } from 'react-i18next'

const genUid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `text-${Math.random().toString(36).slice(2)}-${Date.now()}`

const MultiTextList = ({ texts, placeholder, onChange }) => {
  const { t } = useTranslation('content')

  const handleChange = (uid, value) => onChange(texts.map((x) => (x.uid === uid ? { ...x, textScript: value } : x)))
  const handleRemove = (uid) => onChange(texts.filter((x) => x.uid !== uid))
  const handleAdd = () => onChange([...texts, { uid: genUid(), textScript: '' }])

  return (
    <div>
      {texts.map((row) => (
        <div key={row.uid} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
          <div style={{ flex: 1 }}>
            <Textarea
              size="md"
              value={row.textScript}
              placeholder={placeholder}
              onChange={(e) => handleChange(row.uid, e.target.value)}
            />
          </div>
          <Button size="sm" theme="delete" onClick={() => handleRemove(row.uid)}>
            {t('removeItem')}
          </Button>
        </div>
      ))}
      <Button size="sm" theme="secondary" onClick={handleAdd}>
        + {t('addText')}
      </Button>
    </div>
  )
}

export default MultiTextList
