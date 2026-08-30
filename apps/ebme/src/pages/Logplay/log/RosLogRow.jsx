// src/pages/Logplay/log/RosLogRow.jsx
import React, { memo } from 'react'

function RosLogRow({ data, index, style }) {
    const item = data.items[index]
    if (!item) return null

    return (
        <div style={{ ...style, ...S.row }}>
            <div style={S.colTime}>{item.timeText}</div>
            <div style={{ ...S.colLevel, color: item.levelColor }}>{item.levelName}</div>
            <div style={S.colMsg} title={item.msg}>
                {item.msg}
            </div>
        </div>
    )
}

const S = {
    row: {
        display: 'grid',
        gridTemplateColumns: '120px 90px 1fr',
        alignItems: 'center',
        gap: 12,
        padding: '0 12px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #F3F4F6',
        height: 22,
        fontSize: 12,
        whiteSpace: 'nowrap',
        overflow: 'hidden'
    },
    colTime: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        color: '#6B7280'
    },
    colLevel: {
        fontWeight: 700,
        letterSpacing: 0.2
    },
    colMsg: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: '#111827'
    }
}

export default memo(RosLogRow)