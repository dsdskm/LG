import React, { useEffect, useMemo, useState } from 'react'
import { StyledPageContent } from './styles'
import { Section, Title } from '@repo/ui'
import { getDiagnostics } from '../../apis/raat'

const toneStyles = {
  green: { background: '#E8F7EF', color: '#178A4B', border: '#BFE8D0' },
  red: { background: '#FDECEC', color: '#C43D3D', border: '#F4B9B9' },
  blue: { background: '#EAF6FB', color: '#1681A7', border: '#BCE5F3' },
  orange: { background: '#FFF4E5', color: '#B76A00', border: '#FFD79A' },
  gray: { background: '#F3F5F8', color: '#667085', border: '#D9DEE7' }
}

const StatusBadge = ({ children, tone = 'gray' }) => {
  const s = toneStyles[tone] || toneStyles.gray
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '0.45rem 0.9rem',
        fontSize: '1.2rem',
        fontWeight: 800,
        background: s.background,
        color: s.color,
        border: `1px solid ${s.border}`
      }}
    >
      {children}
    </span>
  )
}

const Panel = ({ children }) => (
  <div
    style={{
      background: '#FFFFFF',
      border: '1px solid #E1E6EF',
      borderRadius: '2rem',
      padding: '2.4rem',
      boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)'
    }}
  >
    {children}
  </div>
)

const MetricCard = ({ label, value, tone = 'gray', hint }) => {
  const s = toneStyles[tone] || toneStyles.gray
  return (
    <div
      style={{ background: s.background, border: `1px solid ${s.border}`, borderRadius: '1.6rem', padding: '1.8rem' }}
    >
      <div style={{ fontSize: '1.25rem', color: s.color, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: '0.8rem', fontSize: '2.8rem', fontWeight: 900, color: '#1F2937' }}>{value ?? 0}</div>
      {hint ? <div style={{ marginTop: '0.6rem', fontSize: '1.2rem', color: '#667085' }}>{hint}</div> : null}
    </div>
  )
}

const getLevelTone = (levelText) => {
  if (levelText === 'OK') return 'green'
  if (levelText === 'WARN') return 'orange'
  if (levelText === 'ERROR') return 'red'
  return 'gray'
}

const Diagnostics = () => {
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState('')

  const fetchDiagnostics = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getDiagnostics()
      setDiagnostics(data)
      if (data?.success === false) {
        setError(data.error || 'Diagnostics 조회에 실패했습니다.')
      }
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(fetchDiagnostics, 2000)
    return () => clearInterval(timer)
  }, [autoRefresh])

  const summary = diagnostics?.summary || {}
  const items = diagnostics?.items || []
  const overallTone = !diagnostics?.available
    ? 'gray'
    : diagnostics?.status === '정상'
      ? 'green'
      : diagnostics?.status === '주의'
        ? 'orange'
        : 'red'
  const topItems = useMemo(() => items.slice(0, 50), [items])

  return (
    <StyledPageContent>
      <Section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1.6rem',
            alignItems: 'flex-start',
            marginBottom: '2.4rem'
          }}
        >
          <div>
            <p style={{ marginTop: '0.8rem', fontSize: '1.4rem', lineHeight: 1.6, color: '#667085' }}>
              ROS2 /diagnostics 토픽의 OK, WARN, ERROR, STALE 상태를 집계하고 상세 메시지를 표시합니다.
            </p>
          </div>
          <StatusBadge tone={overallTone}>{diagnostics?.available ? diagnostics?.status : '수신 대기'}</StatusBadge>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: '1.6rem',
              border: '1px solid #F4B9B9',
              background: '#FDECEC',
              color: '#C43D3D',
              borderRadius: '1.4rem',
              padding: '1.4rem 1.6rem',
              fontSize: '1.3rem',
              fontWeight: 800
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '1.2rem',
            marginBottom: '2rem'
          }}
        >
          <MetricCard label="OK" value={summary.ok} tone="green" hint="정상 항목" />
          <MetricCard label="WARN" value={summary.warn} tone="orange" hint="주의 필요" />
          <MetricCard label="ERROR" value={summary.error} tone="red" hint="오류 항목" />
          <MetricCard label="STALE" value={summary.stale} tone="gray" hint="오래된 상태" />
        </div>

        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1.2rem',
              flexWrap: 'wrap',
              marginBottom: '1.8rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#1F2937' }}>진단 로그 상세</h3>
              <p style={{ marginTop: '0.6rem', fontSize: '1.3rem', color: '#667085' }}>
                Topic: {diagnostics?.topic || '/diagnostics'} · 최근 갱신: {diagnostics?.updated_age_sec ?? '-'}초 전
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={fetchDiagnostics}
                disabled={loading}
                style={{
                  border: 'none',
                  borderRadius: '1.2rem',
                  background: loading ? '#CBD5E1' : '#5DB7D8',
                  color: 'white',
                  padding: '1.1rem 1.8rem',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '확인 중...' : '새로고침'}
              </button>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                style={{
                  border: '1px solid #E1E6EF',
                  borderRadius: '1.2rem',
                  background: autoRefresh ? '#F8FAFC' : '#FFFFFF',
                  color: '#475467',
                  padding: '1.1rem 1.8rem',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                자동 갱신 {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {!diagnostics?.available ? (
            <div
              style={{
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                borderRadius: '1.6rem',
                padding: '3rem',
                textAlign: 'center',
                color: '#8A94A6',
                fontSize: '1.35rem',
                fontWeight: 700
              }}
            >
              /diagnostics 토픽을 아직 수신하지 못했습니다.
            </div>
          ) : topItems.length === 0 ? (
            <div
              style={{
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                borderRadius: '1.6rem',
                padding: '3rem',
                textAlign: 'center',
                color: '#8A94A6',
                fontSize: '1.35rem',
                fontWeight: 700
              }}
            >
              표시할 진단 항목이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', maxHeight: '46rem', overflow: 'auto' }}>
              {topItems.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  style={{
                    border: '1px solid #E3E8EF',
                    background: '#FFFFFF',
                    borderRadius: '1.4rem',
                    padding: '1.4rem 1.6rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1.2rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div>
                      <div style={{ color: '#1F2937', fontSize: '1.45rem', fontWeight: 900 }}>
                        {item.name || '(no name)'}
                      </div>
                      <div style={{ marginTop: '0.5rem', color: '#667085', fontSize: '1.25rem', lineHeight: 1.5 }}>
                        {item.message || '-'}
                      </div>
                      {item.hardware_id ? (
                        <div style={{ marginTop: '0.5rem', color: '#8A94A6', fontSize: '1.15rem' }}>
                          HW: {item.hardware_id}
                        </div>
                      ) : null}
                    </div>
                    <StatusBadge tone={getLevelTone(item.level_text)}>{item.level_text}</StatusBadge>
                  </div>

                  {item.values?.length ? (
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {item.values.map((value) => (
                        <span
                          key={`${item.name}-${value.key}`}
                          style={{
                            borderRadius: 999,
                            background: '#F3F5F8',
                            color: '#667085',
                            padding: '0.45rem 0.8rem',
                            fontSize: '1.1rem',
                            fontWeight: 700
                          }}
                        >
                          {value.key}: {value.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Section>
    </StyledPageContent>
  )
}

export default Diagnostics
