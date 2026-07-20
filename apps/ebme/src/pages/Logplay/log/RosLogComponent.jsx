import React, { memo, useMemo } from 'react'
import { List } from 'react-window'
import { useRosLogModel } from './useRosLogModel'
import { usePlayback } from '../PlaybackContext'

// ✅ level style 캐시 (색상별 style 객체 재사용)
const levelStyleCache = new Map()
function getLevelStyle(color) {
    let s = levelStyleCache.get(color)
    if (!s) {
        s = { ...S.levelBase, color }
        levelStyleCache.set(color, s)
    }
    return s
}

const RosLogRow = memo(function RosLogRow(props) {
    const { index, style, logs, showTitle = true } = props
    const x = logs?.[index]
    if (!x) return <div style={style} />

    // ✅ title 문자열 생성은 옵션 (길어서 GC 부담 큼)
    const title = showTitle
        ? `${x.timeText} [${x.levelName}] ${x.name} ${x.msg}`
        : undefined

    return (
        // ✅ 바깥은 react-window가 준 style만 적용(레이아웃/포지션용)
        <div style={style} title={title}>
            {/* ✅ 실제 row style은 내부에 고정 객체 사용 */}
            <div style={S.row}>
                {/* ✅ borderLeft 문자열 대신 색상만 동적으로 */}
                <div style={{ ...S.leftBorder, borderLeftColor: x.levelColor }} />

                <div style={S.time}>{x.timeText}</div>
                <div style={getLevelStyle(x.levelColor)}>{x.levelName}</div>
                <div style={S.name}>{x.name}</div>
                <div style={S.msg}>{x.msg}</div>
            </div>
        </div>
    )
})

export default function RosLogComponent({ maxView = 5000, rowHeight = 22, maxBuffer = 20000 }) {
    const { paused, togglePaused } = usePlayback()

    const {
        filteredLogs,
        rawCount,
        viewCount,
        enabledLevels,
        toggleLevel,
        search,
        setSearch,
        onClear,
        listRef
    } = useRosLogModel({ maxView, rowHeight, maxBuffer })

    // ✅ rowProps 안정화 + showTitle 옵션 전달
    const rowProps = useMemo(
        () => ({ logs: filteredLogs, showTitle: false }), // <- 필요하면 true로
        [filteredLogs]
    )

    return (
        <div style={S.root}>
            <div style={S.toolbar}>
                {['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].map((lv) => (
                    <label key={lv} style={S.check}>
                        <input
                            type="checkbox"
                            checked={enabledLevels.has(lv)}
                            onChange={() => toggleLevel(lv)}
                        />
                        {lv}
                    </label>
                ))}

                <input
                    style={S.input}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="검색: msg / node"
                />

                <button style={paused ? S.btnPrimary : S.btn} onClick={togglePaused}>
                    {paused ? 'Resume' : 'Pause'}
                </button>
                <button style={S.btn} onClick={onClear}>Clear</button>

                <div style={S.stats}>
                    {paused ? 'PAUSED' : 'PLAYING'} / buf: <b>{rawCount}</b> / view: <b>{viewCount}</b>
                </div>
            </div>

            <div style={S.listWrap}>
                {viewCount <= 0 ? (
                    <div style={S.empty}>표시할 로그가 없습니다.</div>
                ) : (
                    <List
                        listRef={listRef}
                        rowComponent={RosLogRow}
                        rowCount={viewCount}
                        rowHeight={rowHeight}
                        rowProps={rowProps}
                        overscanCount={8}
                        defaultHeight={300}
                        style={{ height: '100%', width: '100%' }}
                    />
                )}
            </div>
        </div>
    )
}

const S = {
    root: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#fff' },
    toolbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' },
    btn: { padding: '6px 10px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 12 },
    btnPrimary: { padding: '6px 10px', borderRadius: 10, border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 12 },
    input: { flex: '1 1 auto', minWidth: 180, padding: '7px 10px', borderRadius: 10, border: '1px solid #E5E7EB', outline: 'none', fontSize: 12 },
    listWrap: { flex: '1 1 auto', minHeight: 0, width: '100%' },
    stats: { fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' },
    check: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },

    // ✅ row는 고정 객체로 유지
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        height: '100%',
        borderBottom: '1px solid #F3F4F6',
        fontSize: 12,
        fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    },

    // ✅ border 문자열 대신 style 객체 재사용 + color만 변경
    leftBorder: { width: 0, height: '100%', borderLeftWidth: 3, borderLeftStyle: 'solid' },

    time: { width: 92, color: '#6B7280', flex: '0 0 auto' },

    // ✅ level은 base 고정 + color만 캐시에서 주입
    levelBase: { width: 60, flex: '0 0 auto', fontWeight: 700 },

    name: { width: 200, flex: '0 0 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    msg: { flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    empty: { padding: 16, fontSize: 12, color: '#6B7280' }
}