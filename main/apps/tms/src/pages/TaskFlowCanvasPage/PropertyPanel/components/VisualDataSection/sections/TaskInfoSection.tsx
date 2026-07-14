import { useMemo, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input } from '@repo/ui'
import { SelectedData } from '../types'
import { useFlowEditorStore } from '@/store/taskflow.canvas.store'
import { PropertyDef } from '../../../types'
import {
  EXECUTION_CONDITION_KEY,
  EXECUTION_CONDITION_OPTIONS,
  EXECUTION_CONDITION_DEFAULT
} from '@/common/constants'
import { Select } from '../../../styles'
import { FieldBody, FieldCard, FieldLabel, InfoBox, TextInput } from './styles.sections'
import ParallelMainNodesSection from '../../ParallelMainNodesSection'


type TaskInfoSectionProps = {
  selectedData: SelectedData | null
  // 읽기 전용(읽기 전용 캔버스 등)에서는 CONTROL 속성 입력을 비활성화한다.
  readOnly?: boolean
}

export default function TaskInfoSection({
  selectedData,
  readOnly = false
}: TaskInfoSectionProps) {
  const { t } = useTranslation('tms')
  const updateSelectedNodeProps = useFlowEditorStore((s) => s.updateSelectedNodeProps)

  const taskRows = useMemo(() => {
    if (!selectedData) return []

    return [
      {
        label: 'label',
        value: selectedData.label ?? ''
      },
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

  // CONTROL/ROOT 타입, 그리고 content 없는 ACTION 타입은
  // property_schema 로 속성을 표현·편집한다. (content 없는 ACTION 은 CONTROL 과 동일하게 취급)
  const isContentlessAction =
    selectedData?.taskType === 'ACTION' && selectedData?.contentId == null
  const hasEditableProperties =
    selectedData?.taskType === 'CONTROL' ||
    selectedData?.taskType === 'ROOT' ||
    isContentlessAction

  const controlPropertyRows = useMemo(() => {
    if (!selectedData) return []
    if (!hasEditableProperties) return []

    const properties = selectedData.properties
    const schemaProperties = selectedData.propertySchema?.properties ?? {}

    if (!properties || typeof properties !== 'object') return []

    // main_nodes 는 직접 수정 불가(아래 체크박스 UI로만 편집)하므로 입력 행에서 제외한다.
    return Object.entries(properties)
      .filter(([key]) => key !== 'main_nodes')
      .map(([key, value]) => {
      const schema = schemaProperties[key] as PropertyDef | undefined

      return {
        key,
        label: key,
        value,
        type: schema?.type ?? 'string',
        required: Boolean(schema?.required)
      }
    })
  }, [selectedData, hasEditableProperties])

  if (!taskRows.length) {
    return <InfoBox>{t('canvas.property.noTaskInfo')}</InfoBox>
  }

  return (
    <>
      {taskRows.map((row) => (
        <Field key={row.label} label={row.label}>
          <TextInput
            type="text"
            value={String(row.value)}
            disabled
            readOnly
          />
        </Field>
      ))}

      {hasEditableProperties && (
        <>
          {controlPropertyRows.length > 0 ? (
            controlPropertyRows.map((row) => (
              <Field
                key={`property-${row.key}`}
                label={row.required ? `${row.label} *` : row.label}
              >
                {row.key === EXECUTION_CONDITION_KEY ? (
                  <Select
                    value={
                      EXECUTION_CONDITION_OPTIONS.includes(String(row.value) as any)
                        ? String(row.value)
                        : EXECUTION_CONDITION_DEFAULT
                    }
                    disabled={readOnly}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      if (readOnly) return
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
                    disabled={readOnly}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (readOnly) return
                      updateSelectedNodeProps({
                        [row.key]: e.target.checked
                      })
                    }}
                  />
                ) : (
                  <Input
                    size="sm"
                    type={row.type === 'number' ? 'number' : 'text'}
                    value={
                      row.value === null || row.value === undefined
                        ? ''
                        : String(row.value)
                    }
                    disabled={readOnly}
                    readOnly={readOnly}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (readOnly) return

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
        </>
      )}

      {/* Parallel 노드: main_nodes 직접 수정 대신 체크박스로 선택 (속성 바로 아래) */}
      <ParallelMainNodesSection readOnly={readOnly} />
    </>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <FieldCard>
      <FieldLabel>{label}</FieldLabel>
      <FieldBody>{children}</FieldBody>
    </FieldCard>
  )
}