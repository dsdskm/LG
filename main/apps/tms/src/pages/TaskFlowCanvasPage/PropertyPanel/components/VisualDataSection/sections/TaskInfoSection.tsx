import { useMemo, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input } from '@repo/ui'
import { SelectedData } from '../types'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { PropertyDef } from '../../../types'
import { EXECUTION_CONDITION_KEY, EXECUTION_CONDITION_OPTIONS, EXECUTION_CONDITION_DEFAULT } from '@/common/constants'
import { Select } from '../../../styles'
import { FieldBody, FieldCard, FieldLabel, InfoBox, TextInput } from './styles.sections'
import ParallelMainNodesSection from '../../ParallelMainNodesSection'

type TaskInfoSectionProps = {
  selectedData: SelectedData | null
  // 읽기 전용(읽기 전용 캔버스 등)에서는 CONTROL 속성 입력을 비활성화한다.
  readOnly?: boolean
}

export default function TaskInfoSection({ selectedData, readOnly = false }: TaskInfoSectionProps) {
  const { t } = useTranslation('tms')
  const updateSelectedNodeProps = useFlowEditorStore((s) => s.updateSelectedNodeProps)

  const taskRows = useMemo(() => {
    if (!selectedData) return []

    return [
      // {
      //   label: 'label',
      //   value: selectedData.label ?? ''
      // },
      {
        label: 'taskId',
        value: selectedData.taskId ?? ''
      },
      {
        label: 'taskName',
        value: selectedData.taskName ?? ''
      },
      {
        label: 'taskType',
        value: selectedData.taskType ?? ''
      }
    ]
  }, [selectedData])

  // property_schema 로 표현되는 속성은 모든 노드 타입에서 보여준다.
  //  - CONTROL/ROOT/content 없는 ACTION: 모든 속성이 편집 대상
  //  - content 가 붙은 ACTION(예: PlaySound): 값이 content 로 정해지는 content_reference 만 읽기 전용이고,
  //    그 외 속성(예: repeat_count)은 편집 가능하다. (BT 에는 node.data.properties 값이 그대로 반영된다)
  const propertyRows = useMemo(() => {
    if (!selectedData) return []

    const properties = (selectedData.properties ?? {}) as Record<string, unknown>
    const schemaProperties = selectedData.propertySchema?.properties ?? {}

    // 스키마 정의를 기준으로 하되, 스키마에 없지만 노드에 저장된 키도 함께 보여준다.
    const keys = Array.from(new Set([...Object.keys(schemaProperties), ...Object.keys(properties)]))

    // main_nodes 는 직접 수정 불가(아래 체크박스 UI로만 편집)하므로 입력 행에서 제외한다.
    return keys
      .filter((key) => key !== 'main_nodes')
      .map((key) => {
        const schema = schemaProperties[key] as PropertyDef | undefined
        const type = schema?.type ?? 'string'

        return {
          key,
          label: key,
          value: properties[key],
          type,
          required: Boolean(schema?.required),
          description: schema?.description,
          // content_reference 는 노드에 묶인 content 가 값을 결정하므로 여기서 바꾸지 않는다.
          disabled: readOnly || type === 'content_reference'
        }
      })
  }, [selectedData, readOnly])

  if (!taskRows.length) {
    return <InfoBox>{t('canvas.property.noTaskInfo')}</InfoBox>
  }

  return (
    <>
      {taskRows.map((row) => (
        <Field key={row.label} label={row.label}>
          <TextInput type="text" value={String(row.value)} disabled readOnly />
        </Field>
      ))}

      {propertyRows.length > 0 ? (
        propertyRows.map((row) => (
          <Field
            key={`property-${row.key}`}
            label={row.required ? `${row.label} *` : row.label}
            hint={row.description}
          >
            {row.key === EXECUTION_CONDITION_KEY ? (
              <Select
                value={
                  EXECUTION_CONDITION_OPTIONS.includes(String(row.value) as any)
                    ? String(row.value)
                    : EXECUTION_CONDITION_DEFAULT
                }
                disabled={row.disabled}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  if (row.disabled) return
                  updateSelectedNodeProps({
                    [row.key]: e.target.value
                  })
                }}
              >
                {EXECUTION_CONDITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : row.type === 'boolean' ? (
              <Checkbox
                checked={Boolean(row.value)}
                disabled={row.disabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (row.disabled) return
                  updateSelectedNodeProps({
                    [row.key]: e.target.checked
                  })
                }}
              />
            ) : (
              <Input
                size="sm"
                type={row.type === 'number' ? 'number' : 'text'}
                value={row.value === null || row.value === undefined ? '' : String(row.value)}
                disabled={row.disabled}
                readOnly={row.disabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (row.disabled) return

                  const rawValue = e.target.value

                  if (row.type === 'number') {
                    updateSelectedNodeProps({
                      [row.key]: rawValue === '' ? '' : Number(rawValue)
                    })
                    return
                  }

                  updateSelectedNodeProps({
                    [row.key]: rawValue
                  })
                }}
              />
            )}
          </Field>
        ))
      ) : (
        <InfoBox>{readOnly ? t('canvas.property.noProperty') : t('canvas.property.noEditableProperty')}</InfoBox>
      )}

      {/* Parallel 노드: main_nodes 직접 수정 대신 체크박스로 선택 (속성 바로 아래) */}
      <ParallelMainNodesSection readOnly={readOnly} />
    </>
  )
}

// hint: property_schema 의 description (라벨에 마우스를 올리면 설명이 보인다)
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <FieldCard>
      <FieldLabel title={hint ?? label}>{label}</FieldLabel>
      <FieldBody>{children}</FieldBody>
    </FieldCard>
  )
}
