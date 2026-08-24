const getFirstLeafKey = (node) => {
  if (!node) return ''
  if (!Array.isArray(node.children) || node.children.length === 0) {
    return String(node.key ?? '')
  }
  return getFirstLeafKey(node.children[0])
}

const containsActiveRoute = (node, activeRouteKey) => {
  if (!node) return false
  if (String(node.key ?? '') === String(activeRouteKey ?? '')) return true
  return (Array.isArray(node.children) ? node.children : []).some((child) => containsActiveRoute(child, activeRouteKey))
}

const RouteTreeItem = ({ route, activeRouteKey, onChange, depth = 0 }) => {
  const children = Array.isArray(route?.children) ? route.children : []
  const hasChildren = children.length > 0
  const active = activeRouteKey === route.key
  const branchActive = containsActiveRoute(route, activeRouteKey)

  return (
    <div style={{ display: 'grid', gap: '4px' }}>
      <button
        type="button"
        onClick={() => onChange(hasChildren ? getFirstLeafKey(route) : route.key)}
        aria-current={active ? 'page' : undefined}
        style={{
          width: '100%',
          border: active ? '1px solid #111827' : '1px solid transparent',
          borderRadius: '8px',
          padding: '9px 10px',
          textAlign: 'left',
          fontSize: depth === 0 ? '14px' : '13px',
          fontWeight: active || depth === 0 ? 800 : 650,
          cursor: 'pointer',
          color: active ? '#ffffff' : branchActive ? '#111827' : '#6b7280',
          background: active ? '#111827' : branchActive ? '#f3f4f6' : 'transparent'
        }}
      >
        {route.label}
      </button>

      {hasChildren && branchActive ? (
        <div
          style={{
            display: 'grid',
            gap: '4px',
            marginLeft: '10px',
            paddingLeft: '10px',
            borderLeft: '1px solid #dbe3ef'
          }}
        >
          {children.map((child) => (
            <RouteTreeItem
              key={child.key}
              route={child}
              activeRouteKey={activeRouteKey}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const AppSideTabs = ({ routeTree, activeRouteKey, onChange }) => {
  const list = Array.isArray(routeTree) ? routeTree : []

  if (list.length <= 0) {
    return (
      <aside
        style={{
          display: 'grid',
          gap: '8px',
          padding: '14px',
          borderRadius: '18px',
          border: '1px solid #e5e7eb',
          background: '#ffffff'
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#111827',
            marginBottom: '4px'
          }}
        >
          상세 화면
        </div>

        <div
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#6b7280'
          }}
        >
          아직 등록된 화면 분류가 없습니다.
        </div>
      </aside>
    )
  }

  return (
    <aside
      style={{
        display: 'grid',
        gap: '8px',
        padding: '14px',
        borderRadius: '18px',
        border: '1px solid #e5e7eb',
        background: '#ffffff'
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 800,
          color: '#111827',
          marginBottom: '4px'
        }}
      >
        상세 화면
      </div>

      {list.map((route) => (
        <RouteTreeItem key={route.key} route={route} activeRouteKey={activeRouteKey} onChange={onChange} />
      ))}
    </aside>
  )
}
