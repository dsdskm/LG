import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button, Dropdown, Input, Table, Title } from '@repo/ui'
import { crudFor } from '@/apis/adminApis'
import useAdminSchemas from '@/hooks/useAdminSchemas'
import RecordModal from './RecordModal'
import { filterableColumns, formatCell, isBooleanColumn } from './fields'
import { Actions, AdminLayout, FilterRow, Notice, Panel, PanelHeader, PanelTitle } from './styles'

/**
 * Admin — DB 데이터 브라우저.
 *
 * 로봇에서는 postgres 가 host loopback(127.0.0.1:5432)에만 listen 하고 pg_hba 도 127.0.0.1/32 만
 * 허용하므로 외부 기기의 DBeaver 로는 붙을 수 없다. 그 자리를 이 화면이 대신한다.
 *
 * 테이블/컬럼 정의는 GET /admin/schema 로 받아오고(하드코딩 없음), 데이터는 각 리소스의
 * 기존 CRUD 라우트를 그대로 호출한다. 페이징은 BE 규약대로 limit/offset 이며 응답 봉투의
 * total 로 전체 건수를 받는다(모든 리소스가 findAndCountAll 로 통일되어 있다).
 *
 * 테이블 선택은 사이드바(=admin 헤더 탭의 GNB, App 에서 같은 스키마 목록으로 생성)가 담당하고
 * 선택값은 URL(/admin/:resource)로 들어온다.
 *
 * ⚠️ init-setup-be 에는 인증 미들웨어가 없다. 이 화면의 접근 제한(AdminGuard)은 UI 차원이고,
 *    실질 보호는 BE 를 loopback 전용으로 두는 배포 설정이 담당한다.
 */

const ROWS_PER_PAGE_OPTIONS = [10, 30, 50, 100]

/**
 * BE 에러 봉투에서 사람이 읽을 메시지를 뽑는다.
 * init-setup-be 의 errorHandler 는 { success: false, error: { message } } 형태로 응답하므로
 * axios 기본 message("Request failed with status code 400") 대신 이 값을 보여줘야 한다.
 */
const errorMessageOf = (error) =>
  error?.response?.data?.error?.message || error?.response?.data?.message || error.message

const Admin = () => {
  const { resource = '' } = useParams()
  const { loading: isSchemaLoading, schemas, error: schemaError } = useAdminSchemas()

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE_OPTIONS[0])
  const [isRowsLoading, setRowsLoading] = useState(false)

  // 적용된 필터(조회에 쓰는 값)와 편집 중인 필터를 분리 — 입력마다 조회하지 않는다.
  const [filterDraft, setFilterDraft] = useState({})
  const [filters, setFilters] = useState({})

  const [modal, setModal] = useState(null) // { mode: 'create' | 'edit', record }
  const [isSaving, setSaving] = useState(false)

  const schema = useMemo(() => schemas.find((item) => item.resource === resource), [schemas, resource])

  useEffect(() => {
    if (schemaError) toast.error(`Failed to load schema: ${errorMessageOf(schemaError)}`, { autoClose: 3000 })
  }, [schemaError])

  // 사이드바에서 테이블을 바꾸면 목록/필터/페이지를 초기화한다.
  useEffect(() => {
    setRows([])
    setTotal(0)
    setPage(1)
    setFilterDraft({})
    setFilters({})
  }, [resource])

  const fetchRows = useCallback(async () => {
    if (!schema) return
    setRowsLoading(true)
    try {
      const { list } = crudFor(schema.resource)
      const response = await list({
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize
      })
      setRows(response?.data || [])
      // total 이 없으면(구버전 응답) 현재 페이지 길이로 대체 — 페이저가 사라지는 것보다 낫다.
      setTotal(response?.total ?? (response?.data || []).length)
    } catch (error) {
      toast.error(`Failed to load ${schema.tableName}: ${errorMessageOf(error)}`, { autoClose: 3000 })
      setRows([])
      setTotal(0)
    } finally {
      setRowsLoading(false)
    }
  }, [schema, filters, page, pageSize])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const applyFilters = () => {
    // 빈 값은 아예 보내지 않는다 — BE 의 where 조립이 truthy 검사라 빈 문자열도 무시되지만,
    // 쿼리스트링을 깔끔하게 유지해 로그에서 실제 필터를 바로 읽을 수 있게 한다.
    const applied = {}
    for (const [key, value] of Object.entries(filterDraft)) {
      if (value !== '' && value !== undefined && value !== null) applied[key] = value
    }
    setPage(1)
    setFilters(applied)
  }

  const resetFilters = () => {
    setFilterDraft({})
    setFilters({})
    setPage(1)
  }

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      const { create, update } = crudFor(schema.resource)
      if (modal.mode === 'create') {
        await create(payload)
        toast.success('Created', { autoClose: 1500 })
      } else {
        await update(modal.record[schema.primaryKey], payload)
        toast.success('Updated', { autoClose: 1500 })
      }
      setModal(null)
      await fetchRows()
    } catch (error) {
      // BE 는 참조 무결성/검증 실패를 400 으로 돌려준다(예: "No map found for the given mapId.")
      const message = errorMessageOf(error)
      toast.error(message, { autoClose: 4000 })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (record) => {
    const id = record[schema.primaryKey]
    // 하위 레코드가 CASCADE 로 함께 지워지는 테이블이 있다(maps → poi_groups/pois/zones/objects).
    if (!window.confirm(`Delete ${schema.tableName} #${id}? Child rows may be deleted too.`)) return
    try {
      const { remove } = crudFor(schema.resource)
      await remove(id)
      toast.success('Deleted', { autoClose: 1500 })
      await fetchRows()
    } catch (error) {
      const message = errorMessageOf(error)
      toast.error(message, { autoClose: 4000 })
    }
  }

  const columns = useMemo(() => {
    if (!schema) return []
    const dataColumns = schema.columns.map((column) => ({
      name: column.name,
      // 셀 값은 문자열로 평탄화한다 — JSONB 컬럼은 객체 그대로 렌더하면 React 가 던진다.
      selector: (row) => formatCell(row[column.name]),
      wrap: false,
      minWidth: column.primaryKey ? '7rem' : '12rem'
    }))

    return [
      ...dataColumns,
      {
        name: '',
        button: true,
        minWidth: '13rem',
        cell: (row) => (
          <Actions>
            <Button size="sm" theme="tertiary" onClick={() => setModal({ mode: 'edit', record: row })}>
              Edit
            </Button>
            <Button size="sm" theme="delete" onClick={() => handleDelete(row)}>
              Del
            </Button>
          </Actions>
        )
      }
    ]
    // handleDelete 는 schema 에만 의존하므로 schema 변경 시에만 다시 만들면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema])

  const filterFields = useMemo(() => (schema ? filterableColumns(schema) : []), [schema])

  // /admin 으로 들어오면 첫 테이블로 보낸다 (사이드바 선택 상태와 URL 을 항상 일치시킨다).
  if (!resource && !isSchemaLoading && schemas.length) {
    return <Navigate to={`/admin/${schemas[0].resource}`} replace />
  }

  return (
    <AdminLayout>
      <Panel>
        <Title>Admin</Title>
        <Notice>
          로봇 DB 를 직접 편집할 수 있습니다. 저장/삭제는 즉시 반영되고 되돌릴 수 없으며, 상위 레코드를 지우면 하위
          레코드가 CASCADE 로 함께 지워집니다.
        </Notice>

        {!schema && !isSchemaLoading && (
          <PanelTitle>{schemas.length ? `Unknown table: ${resource}` : 'No resources'}</PanelTitle>
        )}

        {schema && (
          <>
            <PanelHeader>
              <PanelTitle>
                {schema.tableName}
                <small>
                  {schema.model} · {total} rows
                </small>
              </PanelTitle>
              <Actions>
                <Button size="sm" theme="secondary" onClick={fetchRows}>
                  Reload
                </Button>
                <Button size="sm" onClick={() => setModal({ mode: 'create', record: null })}>
                  New
                </Button>
              </Actions>
            </PanelHeader>

            {!!filterFields.length && (
              <FilterRow>
                {filterFields.map((column) =>
                  column.enumValues || isBooleanColumn(column) ? (
                    <Dropdown
                      key={column.name}
                      label={column.name}
                      placeholder="(all)"
                      value={filterDraft[column.name] ?? ''}
                      options={column.enumValues || ['true', 'false']}
                      onChange={(selected) => setFilterDraft((prev) => ({ ...prev, [column.name]: selected }))}
                    />
                  ) : (
                    <Input
                      key={column.name}
                      label={column.name}
                      type="number"
                      placeholder="(all)"
                      value={filterDraft[column.name] ?? ''}
                      onChange={(event) => setFilterDraft((prev) => ({ ...prev, [column.name]: event.target.value }))}
                    />
                  )
                )}
                <Actions>
                  <Button size="sm" onClick={applyFilters}>
                    Apply
                  </Button>
                  <Button size="sm" theme="secondary" onClick={resetFilters}>
                    Reset
                  </Button>
                </Actions>
              </FilterRow>
            )}

            <Table
              columns={columns}
              data={rows}
              isLoading={isRowsLoading}
              noData="No rows"
              dense
              pagination
              paginationServer
              paginationTotalRows={total}
              paginationPerPage={pageSize}
              paginationDefaultPage={page}
              paginationRowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              onChangePage={(next) => setPage(next)}
              onChangeRowsPerPage={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </>
        )}
      </Panel>

      {modal && schema && (
        <RecordModal
          // 리소스/레코드가 바뀌면 폼 초기값을 다시 계산해야 하므로 강제 remount 한다
          // (RecordModal 의 폼 상태는 useState 초기화에서 한 번만 만들어진다).
          key={`${schema.resource}-${modal.mode}-${modal.record?.[schema.primaryKey] ?? 'new'}`}
          isOpen
          mode={modal.mode}
          schema={schema}
          record={modal.record}
          isSaving={isSaving}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
        />
      )}
    </AdminLayout>
  )
}

export default Admin
