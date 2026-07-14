// SensorChart.jsx
import React, { useEffect, useRef, useMemo } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

export default React.memo(function SensorChart({
  sampleMode = false,
  data: mcapData,
  title = 'Sensor Data',
  labels = { x: 'X', y: 'Y', z: 'Z' },
  colors = { x: 'red', y: 'blue', z: 'green' },
  playheadSec = null,
  t0EpochMs = null,
  // [min,max] 절대 초. 여러 차트의 x축을 동일 범위로 고정 → 재생 커서가 모든 차트에서 일관되게 보임
  xRange = null
}) {
  const chartRef = useRef(null)
  const plotRef = useRef(null)

  // 샘플 데이터 생성 (시간 t, x/y/z 센서값)
  function generateSample() {
    const t = []
    const x = []
    const y = []
    const z = []
    for (let i = 0; i < 600; i++) {
      t.push(i)
      x.push(Math.sin(i / 50) + Math.random() * 0.1)
      y.push(Math.cos(i / 60) + Math.random() * 0.1)
      z.push(Math.sin(i / 30) * 0.5 + Math.random() * 0.2)
    }
    return { t, x, y, z }
  }

  const sensor = sampleMode ? generateSample() : mcapData
  const baseSec = t0EpochMs != null ? t0EpochMs / 1000 : 0

  // ✅ 재생 위치 수직선용 ref (플러그인 draw 훅이 매 redraw마다 현재값을 읽는다)
  const baseSecRef = useRef(0)
  baseSecRef.current = baseSec
  const playheadSecRef = useRef(null)
  playheadSecRef.current = playheadSec

  const xTime = useMemo(() => {
    if (!sensor?.t || !Array.isArray(sensor.t)) return []
    return sensor.t.map((v) => v + baseSec)
  }, [sensor, baseSec])

  useEffect(() => {
    if (!chartRef.current || !sensor) return
    if (!Array.isArray(sensor.t) || sensor.t.length === 0) return

    // ✅ 이미 존재하면 setData()로 갱신 (깜빡임 방지)
    if (plotRef.current) {
      try {
        plotRef.current.setData([xTime, sensor.x, sensor.y, sensor.z])
      } catch {
        /* 크기 불일치 등 → 아래서 재생성 */
      }
      return
    }

    // ✅ 재생 위치 절대 초(= 상대초 + base). 차트 x축(xTime)과 동일 스케일.
    const getPlayheadAbsSec = () => {
      const s = playheadSecRef.current
      return s == null || !Number.isFinite(s) ? null : s + baseSecRef.current
    }

    // uPlot 설정
    const opts = {
      title: sampleMode ? `${title} (Sample)` : title,
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight,
      scales: {
        x: {
          time: baseSec > 0,
          // 전체 주행 구간으로 x축 고정(있으면). 차트마다 데이터 범위가 달라도 동일 축 → 커서 일관 표시
          ...(Array.isArray(xRange) && xRange.length === 2 ? { range: [xRange[0], xRange[1]] } : null)
        }
      },
      cursor: { x: false, y: false },
      plugins: [playheadPlugin(getPlayheadAbsSec)],
      series: [
        {}, // x-axis
        { label: labels.x || 'X', stroke: colors.x || 'red' },
        { label: labels.y || 'Y', stroke: colors.y || 'blue' },
        { label: labels.z || 'Z', stroke: colors.z || 'green' }
      ]
    }

    const data = [xTime, sensor.x, sensor.y, sensor.z]

    plotRef.current = new uPlot(opts, data, chartRef.current)

    const resize = () => {
      if (!plotRef.current) return
      plotRef.current.setSize({
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight
      })
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [sensor, sampleMode, title, labels, colors, baseSec])

  // ✅ x축 고정 범위가 바뀌면(로그 변경 등) 스케일을 갱신 (재생성 없이 setData만 타는 경우 대비)
  const xMin = Array.isArray(xRange) ? xRange[0] : null
  const xMax = Array.isArray(xRange) ? xRange[1] : null
  useEffect(() => {
    const plot = plotRef.current
    if (plot && Number.isFinite(xMin) && Number.isFinite(xMax)) {
      try {
        plot.setScale('x', { min: xMin, max: xMax })
      } catch {}
    }
  }, [xMin, xMax])

  // ✅ 재생 위치가 바뀌면 redraw만 트리거 → 플러그인 draw 훅이 빨간 선을 다시 그림
  //    (캔버스에 직접 그리므로 DOM 좌표/배율(dpr)/z-index 문제 없이 정확히 표시)
  useEffect(() => {
    const plot = plotRef.current
    if (plot) plot.redraw(false)
  }, [playheadSec])

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 6,
        boxSizing: 'border-box',
        position: 'relative'
      }}
    />
  )
})

// ✅ uPlot 플러그인: 재생 위치 빨간 수직선을 캔버스에 직접 그린다.
//    valToPos(...,true)·u.bbox·u.ctx 모두 "캔버스 픽셀" 단위라 좌표가 항상 일치.
function playheadPlugin(getAbsSec) {
  return {
    hooks: {
      draw: (u) => {
        const sec = typeof getAbsSec === 'function' ? getAbsSec() : null
        if (sec == null || !Number.isFinite(sec)) return
        const cx = u.valToPos(sec, 'x', true) // 캔버스 px
        const { left, top, width, height } = u.bbox
        if (!Number.isFinite(cx) || cx < left - 0.5 || cx > left + width + 0.5) return
        const ctx = u.ctx
        ctx.save()
        ctx.beginPath()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = Math.max(1, Math.round(u.pxRatio || 1))
        ctx.moveTo(cx, top)
        ctx.lineTo(cx, top + height)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
}
