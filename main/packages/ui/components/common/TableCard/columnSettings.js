// 테이블/카드 표시 컬럼 사용자 설정 — localStorage 저장/복원 유틸
// 컬럼은 불변 `id`가 있어야 설정 대상(없으면 항상 표시). `configurable:false` 는 설정에서 제외.

const keyOf = (tableId, view) => `tableCols:${tableId}:${view}`

export const getConfigurableColumns = (columns = []) => columns.filter((c) => c && c.id && c.configurable !== false)

// 기본 표시 집합: table = 설정가능 전체, card = 설정가능 중 card !== false
const defaultVisible = (columns, view) => {
  const cfg = getConfigurableColumns(columns)
  const ids = view === 'card' ? cfg.filter((c) => c.card !== false).map((c) => c.id) : cfg.map((c) => c.id)
  return new Set(ids)
}

const loadView = (tableId, columns, view) => {
  const validIds = new Set(getConfigurableColumns(columns).map((c) => c.id))
  try {
    const raw = localStorage.getItem(keyOf(tableId, view))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr.filter((id) => validIds.has(id))) // 현재 컬럼과 교집합
    }
  } catch {
    /* ignore */
  }
  return defaultVisible(columns, view)
}

export const loadColumnSettings = (tableId, columns) => ({
  table: loadView(tableId, columns, 'table'),
  card: loadView(tableId, columns, 'card')
})

export const saveColumnSettings = (tableId, settings) => {
  try {
    localStorage.setItem(keyOf(tableId, 'table'), JSON.stringify([...settings.table]))
    localStorage.setItem(keyOf(tableId, 'card'), JSON.stringify([...settings.card]))
  } catch {
    /* ignore */
  }
}

// 기본값 집합(리셋용)
export const defaultColumnSettings = (columns) => ({
  table: defaultVisible(columns, 'table'),
  card: defaultVisible(columns, 'card')
})
