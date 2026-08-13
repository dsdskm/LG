/**
 * admin 폼/테이블의 값 변환 규칙.
 *
 * BE 메타(columns[].type)는 sequelize 타입 키(STRING/INTEGER/DOUBLE/BOOLEAN/JSON/JSONB/DATE ...)다.
 * 입력은 전부 문자열로 들어오므로, 여기서 타입에 맞게 되돌려 보내야 한다 —
 * 숫자 컬럼에 "12" 를 문자열로 보내면 postgres 가 거부하거나(정수 컬럼) 의도와 다르게 저장된다.
 */

const JSON_TYPES = ['JSON', 'JSONB']
const NUMBER_TYPES = ['INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DOUBLE PRECISION', 'DECIMAL', 'REAL']

export const isJsonColumn = (column) => JSON_TYPES.includes(column?.type)
export const isNumberColumn = (column) => NUMBER_TYPES.includes(column?.type)
export const isBooleanColumn = (column) => column?.type === 'BOOLEAN'

/** 테이블 셀 표시용 문자열. 객체/배열은 JSON 으로 접어서 한 줄에 보여준다. */
export const formatCell = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** 폼 초기값(문자열 상태) — JSON 컬럼은 보기 좋게 들여쓴 텍스트로 편집한다. */
export const toFormValue = (value, column) => {
  if (value === null || value === undefined) return ''
  if (isJsonColumn(column) && typeof value === 'object') return JSON.stringify(value, null, 2)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * 폼 문자열 → API 로 보낼 값.
 *
 * 빈 문자열은 undefined 로 돌려 payload 에서 제외한다 — BE 의 화이트리스트(pickEditable)는
 * undefined 인 키를 "안 보낸 것"으로 취급하므로 건드리지 않은 필드가 덮어써지지 않는다.
 * (그래서 이미 값이 있는 컬럼을 admin 에서 NULL 로 되돌리는 것은 불가능하다 — 의도된 제약.)
 *
 * @throws {Error} JSON 컬럼의 텍스트가 파싱되지 않을 때
 */
export const fromFormValue = (raw, column) => {
  const value = typeof raw === 'string' ? raw.trim() : raw
  if (value === '' || value === undefined || value === null) return undefined

  if (isJsonColumn(column)) {
    try {
      return JSON.parse(value)
    } catch (error) {
      throw new Error(`${column.name}: invalid JSON (${error.message})`)
    }
  }
  if (isBooleanColumn(column)) return value === 'true' || value === true
  if (isNumberColumn(column)) {
    const num = Number(value)
    if (Number.isNaN(num)) throw new Error(`${column.name}: not a number`)
    return num
  }
  return value
}

/**
 * 목록 필터로 쓸 컬럼.
 *
 * BE 의 list() 는 리소스별로 정해진 키만 where 로 받는다(예: maps → siteId/areaId/status).
 * 지원하지 않는 키를 보내도 무시되므로 안전하지만, 사용자 혼란을 줄이려고 실제로 필터가 걸리는
 * 부류(부모 FK · enum · boolean)만 노출한다.
 */
export const filterableColumns = (schema) =>
  schema.columns.filter((column) => column.references || column.enumValues || isBooleanColumn(column))
