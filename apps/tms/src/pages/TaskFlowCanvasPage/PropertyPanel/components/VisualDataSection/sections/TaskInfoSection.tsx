import {
  useMemo,
  type ChangeEvent,
  type ReactNode
} from 'react'
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
import {
  FieldBody,
  FieldCard,
  FieldLabel,
  InfoBox,
  TextInput
} from './styles.sections'
import ParallelMainNodesSection from '../../ParallelMainNodesSection'
import ParallelCountGuide from './ParallelCountGuide'

type TaskInfoSectionProps = {
  selectedData: SelectedData | null

  // 읽기 전용 캔버스에서는 속성 입력을 비활성화한다.
  readOnly?: boolean
}

export default function TaskInfoSection({
  selectedData,
  readOnly = false
}: TaskInfoSectionProps) {
  const { t } = useTranslation('tms')

  const updateSelectedNodeProps = useFlowEditorStore(
    (state) => state.updateSelectedNodeProps
  )

  const taskRows = useMemo(() => {
    if (!selectedData) {
      return []
    }

    return [
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

  /**
   * property_schema로 표현되는 속성은 모든 노드 타입에서 표시한다.
   *
   * CONTROL / ROOT / content 없는 ACTION:
   * 모든 속성이 편집 대상이다.
   *
   * content가 연결된 ACTION:
   * content_reference만 읽기 전용이고 나머지 속성은 편집할 수 있다.
   *
   * main_nodes:
   * 일반 입력 필드에서는 제외하고
   * ParallelMainNodesSection에서 체크박스로 편집한다.
   */
  const propertyRows = useMemo(() => {
    if (!selectedData) {
      return []
    }

    const properties = (
      selectedData.properties ?? {}
    ) as Record<string, unknown>

    const schemaProperties =
      selectedData.propertySchema?.properties ?? {}

    // 스키마에 정의된 속성과 실제 노드에 저장된 속성을 모두 표시한다.
    const keys = Array.from(
      new Set([
        ...Object.keys(schemaProperties),
        ...Object.keys(properties)
      ])
    )

    return keys
      .filter((key) => key !== 'main_nodes')
      .map((key) => {
        const schema = schemaProperties[key] as
          | PropertyDef
          | undefined

        const type = schema?.type ?? 'string'

        return {
          key,
          label: key,
          value: properties[key],
          type,
          required: Boolean(schema?.required),
          description: schema?.description,

          // content_reference는 연결된 content가 값을 결정하므로
          // Property 패널에서 직접 수정하지 않는다.
          disabled:
            readOnly ||
            type === 'content_reference'
        }
      })
  }, [selectedData, readOnly])

  if (!taskRows.length) {
    return (
      <InfoBox>
        {t('canvas.property.noTaskInfo')}
      </InfoBox>
    )
  }

  return (
    <>
      {taskRows.map((row) => (
        <Field
          key={row.label}
          label={row.label}
        >
          <TextInput
            type="text"
            value={String(row.value)}
            disabled
            readOnly
          />
        </Field>
      ))}

      {propertyRows.length > 0 ? (
        propertyRows.map((row) => (
          <Field
            key={`property-${row.key}`}
            label={
              row.required
                ? `${row.label} *`
                : row.label
            }
            hint={row.description}
          >
            {row.key === EXECUTION_CONDITION_KEY ? (
              <Select
                value={
                  EXECUTION_CONDITION_OPTIONS.includes(
                    String(row.value) as (typeof EXECUTION_CONDITION_OPTIONS)[number]
                  )
                    ? String(row.value)
                    : EXECUTION_CONDITION_DEFAULT
                }
                disabled={row.disabled}
                onChange={(
                  event: ChangeEvent<HTMLSelectElement>
                ) => {
                  if (row.disabled) {
                    return
                  }

                  updateSelectedNodeProps({
                    [row.key]: event.target.value
                  })
                }}
              >
                {EXECUTION_CONDITION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </Select>
            ) : row.type === 'boolean' ? (
              <Checkbox
                checked={Boolean(row.value)}
                disabled={row.disabled}
                onChange={(
                  event: ChangeEvent<HTMLInputElement>
                ) => {
                  if (row.disabled) {
                    return
                  }

                  updateSelectedNodeProps({
                    [row.key]: event.target.checked
                  })
                }}
              />
            ) : (
              <>
                <Input
                  size="sm"
                  type={
                    row.type === 'number'
                      ? 'number'
                      : 'text'
                  }
                  value={
                    row.value === null ||
                    row.value === undefined
                      ? ''
                      : String(row.value)
                  }
                  disabled={row.disabled}
                  readOnly={row.disabled}
                  onChange={(
                    event: ChangeEvent<HTMLInputElement>
                  ) => {
                    if (row.disabled) {
                      return
                    }

                    const rawValue = event.target.value

                    if (row.type === 'number') {
                      updateSelectedNodeProps({
                        [row.key]:
                          rawValue === ''
                            ? ''
                            : Number(rawValue)
                      })

                      return
                    }

                    updateSelectedNodeProps({
                      [row.key]: rawValue
                    })
                  }}
                />

                {row.key === 'success_count' ? (
                  <ParallelCountGuide
                    selectedData={selectedData}
                    propertyKey="success_count"
                  />
                ) : null}

                {row.key === 'failure_count' ? (
                  <ParallelCountGuide
                    selectedData={selectedData}
                    propertyKey="failure_count"
                  />
                ) : null}
              </>
            )}
          </Field>
        ))
      ) : (
        <InfoBox>
          {readOnly
            ? t('canvas.property.noProperty')
            : t('canvas.property.noEditableProperty')}
        </InfoBox>
      )}

      {/* Parallel 노드의 Main Node 선택 UI */}
      <ParallelMainNodesSection
        readOnly={readOnly}
      />
    </>
  )
}

type FieldProps = {
  label: string
  hint?: string
  children: ReactNode
}

/**
 * hint는 property_schema의 description이다.
 * 라벨에 마우스를 올리면 설명을 표시한다.
 */
function Field({
  label,
  hint,
  children
}: FieldProps) {
  return (
    <FieldCard>
      <FieldLabel title={hint ?? label}>
        {label}
      </FieldLabel>

      <FieldBody>
        {children}
      </FieldBody>
    </FieldCard>
  )
}