import {
  useMemo,
  type ChangeEvent,
  type ReactNode
} from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input } from '@repo/ui'

function normalizeNodeName(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function isIfThenElseNode(node: any): boolean {
  const taskType = String(node?.data?.taskType ?? '').toUpperCase()
  const name = normalizeNodeName(node?.data?.taskName ?? node?.data?.label ?? node?.data?.name)
  return taskType === 'CONTROL' && (name === 'ifthenelse' || name === 'if then else' || name === 'if_then_else')
}

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

  const selectedNodeId = useFlowEditorStore((state) => state.selectedNodeId)
  const nodes = useFlowEditorStore((state) => state.nodes)
  const edges = useFlowEditorStore((state) => state.edges)
  const updateSelectedNodeProps = useFlowEditorStore(
    (state) => state.updateSelectedNodeProps
  )

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  )

  const ifThenElseChildNodes = useMemo<Array<{ id: string; data?: Record<string, any> }>>(() => {
    if (!selectedNode || !isIfThenElseNode(selectedNode)) return []

    const childIds = Array.from(
      new Set(
        edges
          .filter(
            (edge) =>
              String(edge.source) === String(selectedNode.id) &&
              String((edge as any)?.sourceHandle ?? '') === 'left'
          )
          .map((edge) => String(edge.target))
      )
    )

    return childIds.flatMap((id) => {
      const node = nodes.find((candidate) => String(candidate.id) === id)
      return node ? [{ id: String(node.id), data: (node as any)?.data ?? {} }] : []
    })
  }, [edges, nodes, selectedNode])

  const branchRoleState = useMemo(() => {
    const raw = (selectedNode?.data as any)?.properties?.ifthenelse_branch_roles
    if (!raw || typeof raw !== 'object') return {}

    const next: Record<string, string> = {}
    for (const [targetId, role] of Object.entries(raw)) {
      if (typeof role === 'string' && role.trim()) {
        next[targetId] = role.trim().toLowerCase()
      }
    }

    return next as Record<string, string>
  }, [selectedNode])

  const branchRoleOptions = useMemo(() => {
    return [
      { value: 'condition', label: 'Condition' },
      { value: 'success', label: 'Success' },
      { value: 'failure', label: 'Failure' }
    ]
  }, [])

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
      .filter((key) => key !== 'main_nodes' && key !== 'ifthenelse_branch_roles')
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
                    readOnly={readOnly}
                    selectedData={selectedData}
                    propertyKey="success_count"
                  />
                ) : null}

                {row.key === 'failure_count' ? (
                  <ParallelCountGuide
                    readOnly={readOnly}
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

      {selectedNode && isIfThenElseNode(selectedNode) ? (
        <FieldCard>
          <FieldLabel>Branch Roles</FieldLabel>
          <FieldBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {branchRoleOptions.map((branch) => {
                const currentTargetId = Object.entries(branchRoleState).find(([, role]) => role === branch.value)?.[0] ?? ''

                return (
                  <div key={branch.value} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FieldLabel style={{ fontSize: 12, fontWeight: 600 }}>{branch.label}</FieldLabel>
                    <Select
                      value={currentTargetId}
                      disabled={readOnly}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                        if (readOnly) return

                        const nextValue = event.target.value
                        const previous = { ...(selectedNode?.data as any)?.properties?.ifthenelse_branch_roles }

                        const cleaned: Record<string, string> = {}
                        for (const [targetId, role] of Object.entries(previous)) {
                          const normalized = String(role ?? '').trim().toLowerCase()
                          if (normalized && normalized !== branch.value && targetId !== nextValue) {
                            cleaned[targetId] = normalized
                          }
                        }

                        if (nextValue) {
                          cleaned[nextValue] = branch.value
                        }

                        updateSelectedNodeProps({
                          ifthenelse_branch_roles: cleaned
                        })
                      }}
                    >
                      <option value="">- 선택 안 함 -</option>
                      {ifThenElseChildNodes.map((node) => (
                        <option key={String(node.id)} value={String(node.id)}>
                          {String((node.data as any)?.label ?? node.id)}
                        </option>
                      ))}
                    </Select>
                  </div>
                )
              })}
            </div>
          </FieldBody>
        </FieldCard>
      ) : null}

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