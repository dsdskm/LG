import { Input } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import { ResolutionRow } from './styles'

/**
 * 콘텐츠 타입별 속성 폼. 현재 IMAGE 만 권장 해상도(width x height)를 제공한다.
 * 그 외 타입은 아무것도 렌더링하지 않는다(TBD).
 */
const CategoryAttributeFields = ({ isImage, attribute, disabled, onChange }) => {
  const { t } = useTranslation('settings')

  if (!isImage) return null

  return (
    <ResolutionRow>
      <span>{t('recommandResolution')}</span>
      <div style={{ width: '14rem' }}>
        <Input
          size="md"
          type="number"
          value={attribute?.recommand_width ?? ''}
          disabled={disabled}
          onChange={(e) => onChange('recommand_width', e.target.value)}
        />
      </div>
      <span>X</span>
      <div style={{ width: '14rem' }}>
        <Input
          size="md"
          type="number"
          value={attribute?.recommand_height ?? ''}
          disabled={disabled}
          onChange={(e) => onChange('recommand_height', e.target.value)}
        />
      </div>
    </ResolutionRow>
  )
}

export default CategoryAttributeFields
