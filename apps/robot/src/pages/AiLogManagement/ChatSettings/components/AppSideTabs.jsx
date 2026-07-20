const getFirstLeafKey = (node) => {
    if (!node) return ''
    if (!Array.isArray(node.children) || node.children.length === 0) {
        return String(node.key ?? '')
    }
    return getFirstLeafKey(node.children[0])
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
                    background: '#ffffff',
                }}
            >
                <div
                    style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: '#111827',
                        marginBottom: '4px',
                    }}
                >
                    상세 화면
                </div>

                <div
                    style={{
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: '#6b7280',
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
                background: '#ffffff',
            }}
        >
            <div
                style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#111827',
                    marginBottom: '4px',
                }}
            >
                상세 화면
            </div>

            {list.map((route) => {
                const hasChildren = Array.isArray(route.children) && route.children.length > 0
                const isParentActive =
                    activeRouteKey === route.key || (hasChildren && activeRouteKey.startsWith(`${route.key}/`))

                return (
                    <div key={route.key} style={{ display: 'grid', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => onChange(hasChildren ? getFirstLeafKey(route) : route.key)}
                            style={{
                                width: '100%',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '11px 12px',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                color: isParentActive ? '#ffffff' : '#374151',
                                background: isParentActive ? '#111827' : '#f9fafb',
                            }}
                        >
                            {route.label}
                        </button>

                        {hasChildren && isParentActive ? (
                            <div
                                style={{
                                    display: 'grid',
                                    gap: '4px',
                                    paddingLeft: '12px',
                                }}
                            >
                                {route.children.map((child) => {
                                    const active = activeRouteKey === child.key

                                    return (
                                        <button
                                            key={child.key}
                                            type="button"
                                            onClick={() => onChange(child.key)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                borderRadius: '10px',
                                                padding: '9px 10px',
                                                textAlign: 'left',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                color: active ? '#111827' : '#6b7280',
                                                background: active ? '#e5e7eb' : 'transparent',
                                            }}
                                        >
                                            {child.label}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : null}
                    </div>
                )
            })}
        </aside>
    )
}