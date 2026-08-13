import { axiosApi, createCrud } from './crudFactory'

/**
 * admin 데이터 브라우저용 API.
 *
 * 테이블/컬럼 정의는 BE 가 sequelize 모델을 반사해서 내려준다(GET /admin/schema) —
 * FE 에 컬럼 목록을 하드코딩하지 않으므로 마이그레이션으로 컬럼이 바뀌어도 화면이 따라간다.
 * 데이터 자체는 admin 전용 경로가 아니라 각 리소스의 기존 CRUD(/maps, /zones ...)를 그대로 쓴다.
 */

/**
 * 전체 테이블 메타데이터 조회 (GET /admin/schema).
 * @returns {Promise<{success: boolean, data: AdminResourceSchema[], total: number}>}
 */
export const getSchemas = async () => {
  return await axiosApi.get('/admin/schema')
}

/**
 * 단일 테이블 메타데이터 조회 (GET /admin/schema/:resource).
 * @param {string} resource 리소스 경로 (예: 'maps')
 */
export const getSchema = async (resource) => {
  return await axiosApi.get(`/admin/schema/${resource}`)
}

/**
 * 리소스 경로로 CRUD 함수 묶음을 만든다.
 *
 * 리소스 키는 BE admin.service.js 의 RESOURCES 키와 동일하고 그게 곧 `/api/v1/{key}` 경로다.
 * 그래서 별도 레지스트리를 두지 않고 스키마 응답의 resource 값으로 그때그때 생성한다 —
 * 테이블이 추가돼도 FE 수정이 필요 없다.
 *
 * @param {string} resource
 * @param {{bulk?: boolean}} [options]
 */
export const crudFor = (resource, options) => createCrud(resource, options)

/**
 * @typedef {object} AdminColumn
 * @property {string} name        모델 속성명 (camelCase, API 가 주고받는 키)
 * @property {string} column      실제 DB 컬럼명 (snake_case)
 * @property {string} type        sequelize 타입 키 (STRING/INTEGER/JSONB/...)
 * @property {string|null} sqlType
 * @property {boolean} allowNull
 * @property {boolean} primaryKey
 * @property {boolean} autoIncrement
 * @property {any} defaultValue
 * @property {string|null} comment
 * @property {{model: string, key: string}|null} references
 * @property {string[]|null} enumValues  validate.isIn 목록 (있으면 드롭다운)
 *
 * @typedef {object} AdminResourceSchema
 * @property {string} resource
 * @property {string} model
 * @property {string} tableName
 * @property {string} primaryKey
 * @property {AdminColumn[]} columns
 * @property {string[]} editableFields    PUT 으로 바꿀 수 있는 필드
 * @property {string[]} createOnlyFields  POST 로만 지정 가능한 부모 FK
 * @property {string[]} creatableFields   생성 폼에 그릴 전체 필드
 * @property {boolean} supportsBulk
 */
