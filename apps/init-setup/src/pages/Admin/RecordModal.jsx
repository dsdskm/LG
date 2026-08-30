import { useMemo, useState } from 'react'
import { Button, Dropdown, Input, JSONEditor, Modal } from '@repo/ui'
import { FieldHint, FormGrid } from './styles'
import { fromFormValue, isBooleanColumn, isJsonColumn, isNumberColumn, toFormValue } from './fields'

/**
 * 레코드 생성/수정 모달.
 *
 * 입력 필드는 BE 메타(schema)가 알려준 목록으로만 만든다:
 *  - create : creatableFields (= createOnlyFields + editableFields)
 *  - edit   : editableFields  (부모 FK 는 수정 대상이 아니다)
 * 메타에 없는 컬럼을 보내도 BE 는 400 이 아니라 조용히 무시하므로, 폼을 메타에 맞추는 게
 * "저장은 됐는데 값이 안 바뀌는" 증상을 막는 유일한 방법이다.
 */
const RecordModal = ({ isOpen, mode, schema, record, onClose, onSubmit, isSaving }) => {
  const isCreate = mode === 'create'

  const fields = useMemo(() => {
    if (!schema) return []
    const names = isCreate ? schema.creatableFields : schema.editableFields
    return names.map((name) => schema.columns.find((column) => column.name === name)).filter(Boolean)
  }, [schema, isCreate])

  // 폼 상태는 전부 문자열로 들고, 전송 직전에 컬럼 타입으로 되돌린다(fields.js).
  const [values, setValues] = useState(() => {
    const initial = {}
    for (const name of isCreate ? schema.creatableFields : schema.editableFields) {
      const column = schema.columns.find((c) => c.name === name)
      initial[name] = isCreate ? '' : toFormValue(record?.[name], column)
    }
    return initial
  })
  const [error, setError] = useState('')

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = () => {
    const payload = {}
    try {
      for (const column of fields) {
        const converted = fromFormValue(values[column.name], column)
        if (converted !== undefined) payload[column.name] = converted
      }
    } catch (conversionError) {
      setError(conversionError.message)
      return
    }
    setError('')
    onSubmit(payload)
  }

  const renderField = (column) => {
    const value = values[column.name] ?? ''
    const label = `${column.name}${column.allowNull ? '' : ' *'}`
    // 컬럼 주석/기본값/실제 DB 컬럼명을 힌트로 노출 — DBeaver 대신 쓰는 화면이라 원본 정보가 중요하다.
    const hint = [
      column.column !== column.name ? `db: ${column.column}` : null,
      column.sqlType,
      column.references ? `→ ${column.references.model}.${column.references.key}` : null,
      column.defaultValue !== undefined && column.defaultValue !== null ? `default: ${column.defaultValue}` : null,
      column.comment
    ]
      .filter(Boolean)
      .join(' · ')

    if (isJsonColumn(column)) {
      return (
        <div className="full" key={column.name}>
          <JSONEditor label={label} value={value} height="18rem" onChange={(text) => setValue(column.name, text)} />
          <FieldHint>{hint}</FieldHint>
        </div>
      )
    }

    if (column.enumValues || isBooleanColumn(column)) {
      const options = column.enumValues || ['true', 'false']
      return (
        <div key={column.name}>
          <Dropdown
            label={label}
            placeholder="(unset)"
            value={value}
            options={options}
            onChange={(selected) => setValue(column.name, selected)}
          />
          <FieldHint>{hint}</FieldHint>
        </div>
      )
    }

    return (
      <div key={column.name}>
        <Input
          label={label}
          type={isNumberColumn(column) ? 'number' : 'text'}
          value={value}
          placeholder="(unset)"
          onChange={(event) => setValue(column.name, event.target.value)}
        />
        <FieldHint>{hint}</FieldHint>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      size="lg"
      closeButton
      title={`${isCreate ? 'Create' : 'Edit'} ${schema.tableName}${isCreate ? '' : ` #${record?.[schema.primaryKey]}`}`}
      onClose={onClose}
      renderButtonComponent={
        <>
          <Button theme="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <FormGrid>{fields.map(renderField)}</FormGrid>
      {error && <FieldHint style={{ color: '#d92d20' }}>{error}</FieldHint>}
      <FieldHint>비워 둔 필드는 전송하지 않는다(기존 값 유지). 값을 NULL 로 되돌리려면 psql 을 써야 한다.</FieldHint>
    </Modal>
  )
}

export default RecordModal
