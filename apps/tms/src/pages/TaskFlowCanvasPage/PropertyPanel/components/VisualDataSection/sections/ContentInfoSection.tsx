import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FieldBody,
  FieldCard,
  FieldLabel,
  InfoBox,
  NestedCard,
  NestedLabel,
  NestedList,
  TextInput
} from './styles.sections'
import { SelectedData } from '../types'

type ContentInfoSectionProps = {
  selectedData: SelectedData | null
}

type Row = { label: string; value: string }

// content_value 가 JSON(object/array) 문자열이면 파싱, 아니면 단순 문자열로 취급한다.
function parseContentValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return raw
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

// object/array 를 카드 안의 카드로 재귀 렌더링한다.
function renderNode(label: string, value: unknown): ReactNode {
  if (isBranch(value)) {
    const entries: [string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [`[${i}]`, v])
      : Object.entries(value)

    return (
      <NestedCard key={label}>
        <NestedLabel>{label}</NestedLabel>
        <NestedList>
          {entries.length === 0 ? (
            <TextInput type="text" value={Array.isArray(value) ? '[]' : '{}'} disabled readOnly />
          ) : (
            entries.map(([key, child]) => renderNode(key, child))
          )}
        </NestedList>
      </NestedCard>
    )
  }

  return (
    <NestedCard key={label}>
      <NestedLabel>{label}</NestedLabel>
      <NestedList>
        <TextInput type="text" value={value == null ? '' : String(value)} disabled readOnly />
      </NestedList>
    </NestedCard>
  )
}

export default function ContentInfoSection({ selectedData }: ContentInfoSectionProps) {
  const { t } = useTranslation('tms')

  // contents 테이블의 속성만 표시한다. (task properties 는 제외)
  const contentRows = useMemo<Row[]>(() => {
    if (!selectedData) return []

    return [
      { label: 'contentId', value: String(selectedData.contentId ?? '') },
      { label: 'contentName', value: selectedData.contentName ?? '' },
      { label: 'contentTypeId', value: String(selectedData.contentTypeId ?? '') },
      { label: 'contentTypeName', value: selectedData.contentTypeName ?? '' },
      { label: 'groupId', value: selectedData.groupId ?? '' },
      { label: 'siteId', value: selectedData.siteId ?? '' }
    ]
  }, [selectedData])

  const parsedContentValue = useMemo(() => parseContentValue(selectedData?.contentValue ?? ''), [selectedData])

  if (!selectedData) {
    return <InfoBox>{t('canvas.property.noContentInfo')}</InfoBox>
  }

  return (
    <>
      {contentRows.map((row) => (
        <Field key={row.label} label={row.label}>
          <TextInput type="text" value={row.value} disabled readOnly />
        </Field>
      ))}

      <Field label="contentValue">
        {isBranch(parsedContentValue) ? (
          <NestedList>
            {(Array.isArray(parsedContentValue)
              ? parsedContentValue.map((v, i): [string, unknown] => [`[${i}]`, v])
              : Object.entries(parsedContentValue)
            ).map(([key, child]) => renderNode(key, child))}
          </NestedList>
        ) : (
          <TextInput type="text" value={String(parsedContentValue)} disabled readOnly />
        )}
      </Field>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FieldCard>
      <FieldLabel>{label}</FieldLabel>
      <FieldBody>{children}</FieldBody>
    </FieldCard>
  )
}
