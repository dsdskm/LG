import { Input, Dropdown } from '@repo/ui'
import { useTranslation } from 'react-i18next'
import CategoryNameInputs from './CategoryNameInputs'
import CategoryIconField from './CategoryIconField'
import CategoryAttributeFields from './CategoryAttributeFields'
import { PaneHeader, Badge, EmptyHint, SettingSection, SectionLabel } from './styles'
import { MAX_CODE_LENGTH } from '@/pages/Settings/Category/useCategoryTreeEditor'

const CategorySettingsPanel = ({
  node,
  languages,
  contentTypeName,
  contentTypeOptions = [],
  contentTypeEditable = false,
  isImage,
  isCodeDuplicate,
  onChangeCode,
  onChangeName,
  onChangeContentType,
  onChangeIcon,
  onChangeAttribute
}) => {
  const { t } = useTranslation('settings')

  if (!node) {
    return (
      <>
        <PaneHeader>{t('settingsPaneTitle')}</PaneHeader>
        <EmptyHint>{t('selectNodeToEdit')}</EmptyHint>
      </>
    )
  }

  // preset(isUserCreated=false) 노드는 내용 조회만 가능, 수정 불가
  const readOnly = !node.isUserCreated

  // 이미 저장된 노드(id 존재)는 코드 변경 시 콘텐츠의 카테고리 참조가 깨지므로 코드 입력 잠금
  const isExisting = node.id != null
  const codeLocked = readOnly || isExisting

  const code = node.categoryCode || ''
  const codeEmpty = !code.trim()
  const codeDup = !codeEmpty && isCodeDuplicate(code)
  const codeTooLong = code.length > MAX_CODE_LENGTH
  const codeError = !codeLocked && (codeEmpty || codeDup || codeTooLong)

  return (
    <>
      <PaneHeader>{t('settingsPaneTitle')}</PaneHeader>

      {/* 콘텐츠 타입: user root(상위 없음)만 선택 가능, 그 외 상속·read-only */}
      <SettingSection>
        <SectionLabel>{t('contentType')}</SectionLabel>
        {contentTypeEditable ? (
          <Dropdown
            size="md"
            value={node.contentTypeId ?? ''}
            placeholder={t('selectContentType')}
            options={contentTypeOptions}
            onChange={onChangeContentType}
          />
        ) : (
          <Badge>{contentTypeName || '-'}</Badge>
        )}
      </SettingSection>

      {/* 코드 (유니크 검증) */}
      <SettingSection>
        <SectionLabel>{t('nodeCode')}</SectionLabel>
        <Input
          size="md"
          value={code}
          placeholder={t('codeRequired')}
          disabled={codeLocked}
          isError={codeError}
          message={
            codeError
              ? codeTooLong
                ? t('codeTooLong', `코드는 ${MAX_CODE_LENGTH}자 이하로 입력하세요`)
                : codeDup
                  ? t('duplicateCode')
                  : t('codeRequired')
              : isExisting && !readOnly
                ? t('codeImmutable', '코드는 생성 후 변경할 수 없습니다.')
                : ''
          }
          onChange={(e) => onChangeCode(e.target.value)}
        />
      </SettingSection>

      {/* 이름 (다국어) */}
      <SettingSection>
        <SectionLabel>{t('nodeName')}</SectionLabel>
        <CategoryNameInputs node={node} languages={languages} disabled={readOnly} onChange={onChangeName} />
      </SettingSection>

      {/* 아이콘 */}
      <SettingSection>
        <SectionLabel>{t('icon')}</SectionLabel>
        <CategoryIconField node={node} disabled={readOnly} onChange={onChangeIcon} />
      </SettingSection>

      {/* 속성 (IMAGE 한정) */}
      {isImage && (
        <SettingSection>
          <SectionLabel>{t('attribute')}</SectionLabel>
          <CategoryAttributeFields
            isImage={isImage}
            attribute={node.categoryAttribute}
            disabled={readOnly}
            onChange={onChangeAttribute}
          />
        </SettingSection>
      )}
    </>
  )
}

export default CategorySettingsPanel
