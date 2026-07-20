// src/pages/Logplay/log/useRosLogModel.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapStore } from '../components/useMapStore'
import { usePlayback } from '../PlaybackContext'

const LEVEL = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, FATAL: 50 }

const LEVEL_NAME = (level) => {
    if (level >= LEVEL.FATAL) return 'FATAL'
    if (level >= LEVEL.ERROR) return 'ERROR'
    if (level >= LEVEL.WARN) return 'WARN'
    if (level >= LEVEL.INFO) return 'INFO'
    return 'DEBUG'
}

const LEVEL_COLOR = (name) => {
    switch (name) {
        case 'DEBUG':
            return '#2563EB'
        case 'INFO':
            return '#111827'
        case 'WARN':
            return '#D97706'
        case 'ERROR':
            return '#DC2626'
        case 'FATAL':
            return '#7C2D12'
        default:
            return '#111827'
    }
}

const pad2 = (n) => String(n).padStart(2, '0')
const pad3 = (n) => String(n).padStart(3, '0')

function formatTime(ms) {
    if (typeof ms !== 'number') return '--:--:--.---'
    const d = new Date(ms)
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`
}

// timeText는 stamp가 아니라 __rxTime(수신시간) 기반
function normalizeRosOutItem(item, index) {
    if (item == null) {
        return {
            id: `nil-${index}`,
            timeText: '--:--:--.---',
            levelName: 'INFO',
            levelColor: LEVEL_COLOR('INFO'),
            name: '',
            msg: '',
            meta: { rxTime: null }
        }
    }

    const rxTime = typeof item.__rxTime === 'number' ? item.__rxTime : Date.now()

    if (typeof item === 'string') {
        return {
            id: `s-${index}-${rxTime}`,
            timeText: formatTime(rxTime),
            levelName: 'INFO',
            levelColor: LEVEL_COLOR('INFO'),
            name: '',
            msg: item,
            meta: { rxTime }
        }
    }

    if (typeof item?.data === 'string') {
        return {
            id: `sd-${index}-${rxTime}`,
            timeText: formatTime(rxTime),
            levelName: 'INFO',
            levelColor: LEVEL_COLOR('INFO'),
            name: '',
            msg: item.data,
            meta: { rxTime }
        }
    }

    const payload = item.data && typeof item.data === 'object' ? item.data : item

    const level = typeof payload.level === 'number' ? payload.level : LEVEL.INFO
    const levelName = LEVEL_NAME(level)

    const msg = String(payload.msg ?? payload.message ?? '')
    const name = String(payload.name ?? '')

    return {
        id: `rx-${rxTime}-${index}`,
        timeText: formatTime(rxTime),
        levelName,
        levelColor: LEVEL_COLOR(levelName),
        name,
        msg,
        meta: { rxTime }
    }
}

export function useRosLogModel({ maxView = 5000, rowHeight = 22, maxBuffer = 20000 } = {}) {
    const { paused } = usePlayback()

    const incomingRosOut = useMapStore((s) => s.renderBuffer?.rosOut)

    const bufferRef = useRef([])
    const seqRef = useRef(0) // ✅ 추가: normalize index용(유니크 id용)
    const [bufferVersion, setBufferVersion] = useState(0)

    const [enabledLevels, setEnabledLevels] = useState(() => new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']))

    const [search, setSearch] = useState('')
    const [freezeLen, setFreezeLen] = useState(0)

    const listRef = useRef(null)

    // paused를 deps에 넣지 않기 위한 ref(중복 append 방지)
    const pausedRef = useRef(paused)
    useEffect(() => {
        pausedRef.current = paused
    }, [paused])

    useEffect(() => {
        if (incomingRosOut == null) return

        // ✅ 항상 길이1 배열이면 첫 원소만 쓰기 (불필요한 arr/map 제거)
        const x = Array.isArray(incomingRosOut) ? incomingRosOut[0] : incomingRosOut
        if (x == null) return

        const now = Date.now()

        // ✅ 중요: 절대 { data: x }로 감싸지 말 것!
        // ✅ 기존 방식 유지: 객체면 {...x, __rxTime}
        const stamped =
            x && typeof x === 'object'
                ? { ...x, __rxTime: now }
                : { __rxTime: now, data: String(x) }

        // ✅ 버퍼에는 raw(stamped)가 아니라 normalize 결과를 넣는 게 정답
        // (이거 하면 매 tick마다 maxView(5000)개 normalize 재생성 안 해도 됨)
        bufferRef.current.push(normalizeRosOutItem(stamped, bufferRef.current.length))

        // ✅ trim은 새 배열 만들지 말고 제자리에서
        if (bufferRef.current.length > maxBuffer) {
            bufferRef.current.splice(0, bufferRef.current.length - maxBuffer)
        }

        if (!pausedRef.current) setBufferVersion((v) => v + 1)
    }, [incomingRosOut, maxBuffer])

    const rawCount = bufferRef.current.length

    useEffect(() => {
        if (paused) {
            setFreezeLen(bufferRef.current.length)
        } else {
            setFreezeLen(0)
            setBufferVersion((v) => v + 1)
        }
    }, [paused])

    const viewSource = useMemo(() => {
        const buf = bufferRef.current
        if (!paused) return buf
        const len = freezeLen > 0 ? freezeLen : buf.length
        return buf.slice(0, len)
    }, [paused, freezeLen, bufferVersion])


    const trimmedSource = useMemo(() => {
        if (!Array.isArray(viewSource)) return []
        if (viewSource.length <= maxView) return viewSource
        return viewSource.slice(viewSource.length - maxView)
    }, [viewSource, maxView, bufferVersion]) // ✅ 추

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        const enabled = enabledLevels

        return trimmedSource.filter((x) => {
            if (!enabled.has(x.levelName)) return false
            if (!q) return true
            const hay = `${x.msg} ${x.name}`.toLowerCase()
            return hay.includes(q)
        })
    }, [trimmedSource, enabledLevels, search, bufferVersion]) // ✅ bufferVersion 꼭 포함

    const viewCount = filtered.length

    const scrollToBottom = useCallback(
        (behavior = 'instant') => {
            const api = listRef.current
            const n = filtered.length
            if (!api || n <= 0) return
            try {
                api.scrollToRow({ index: n - 1, align: 'end', behavior })
            } catch (e) { }
        },
        [filtered.length]
    )

    useEffect(() => {
        if (paused) return
        scrollToBottom('instant')
    }, [bufferVersion, paused, scrollToBottom])

    const onClear = useCallback(() => {
        bufferRef.current = []
        seqRef.current = 0 // ✅ 추가
        setFreezeLen(0)
        setSearch('')
        setEnabledLevels(new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']))
        setBufferVersion((v) => v + 1)
    }, [])

    const toggleLevel = useCallback((name) => {
        setEnabledLevels((prev) => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            if (next.size === 0) return new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'])
            return next
        })
    }, [])

    const setAllLevels = useCallback((on) => {
        setEnabledLevels(on ? new Set(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']) : new Set(['DEBUG']))
    }, [])

    return {
        filteredLogs: filtered,
        rawCount,
        viewCount,
        enabledLevels,
        toggleLevel,
        setAllLevels,
        search,
        setSearch,
        paused,
        onClear,
        listRef,
        rowHeight,
        scrollToBottom
    }
}