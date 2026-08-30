import React, { useEffect, useMemo, useState } from 'react'
import { StyledPageContent } from './styles'
import { Section, Title } from '@repo/ui'
import { getRos2Status } from '../../apis/raat'

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

const MetricCard = ({ label, value, hint }) => (
  <div
    style={{
      background: '#F8FAFC',
      border: '1px solid #E3E8EF',
      borderRadius: '1.6rem',
      padding: '1.8rem'
    }}
  >
    <div style={{ fontSize: '1.25rem', color: '#667085', fontWeight: 800 }}>{label}</div>
    <div style={{ marginTop: '0.8rem', fontSize: '2.8rem', fontWeight: 900, color: '#1F2937' }}>{value ?? '-'}</div>
    {hint ? <div style={{ marginTop: '0.6rem', fontSize: '1.2rem', color: '#8A94A6' }}>{hint}</div> : null}
  </div>
)

const ListPanel = ({ title, items = [], emptyText, renderItem }) => (
  <Panel>
    <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#1F2937' }}>{title}</h3>
    <div style={{ marginTop: '1.6rem', display: 'grid', gap: '0.8rem', maxHeight: '32rem', overflow: 'auto' }}>
      {items.length === 0 ? (
        <div
          style={{
            border: '1px dashed #CBD5E1',
            background: '#F8FAFC',
            borderRadius: '1.4rem',
            padding: '2.4rem',
            color: '#8A94A6',
            fontSize: '1.3rem',
            textAlign: 'center'
          }}
        >
          {emptyText}
        </div>
      ) : (
        items.map(renderItem)
      )}
    </div>
  </Panel>
)

const Ros2Status = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState('')

  const fetchStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getRos2Status()
      setStatus(data)
      if (data?.success === false) {
        setError(data.error || 'ROS2 상태 조회에 실패했습니다.')
      }
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(fetchStatus, 2000)
    return () => clearInterval(timer)
  }, [autoRefresh])

  const requiredTopics = status?.required_topics || []
  const missingRequiredTopics = requiredTopics.filter((topic) => !topic.available)
  const rosTone = status?.available ? (missingRequiredTopics.length ? 'orange' : 'green') : 'gray'
  const rosLabel = status?.available ? (missingRequiredTopics.length ? '일부 토픽 미수신' : 'ROS2 활성') : '대기 중'

  const topicPreview = useMemo(() => (status?.topics || []).slice(0, 80), [status])
  const nodePreview = useMemo(() => (status?.nodes || []).slice(0, 80), [status])

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
              ROS2 그래프의 노드, 토픽, 서비스 목록과 필수 토픽 수신 가능 여부를 확인합니다.
            </p>
          </div>
          <StatusBadge tone={rosTone}>{rosLabel}</StatusBadge>
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
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '1.2rem',
            marginBottom: '2rem'
          }}
        >
          <MetricCard label="Node" value={status?.summary?.node_count} hint="현재 발견된 ROS2 노드 수" />
          <MetricCard label="Topic" value={status?.summary?.topic_count} hint="현재 발견된 ROS2 토픽 수" />
          <MetricCard label="Service" value={status?.summary?.service_count} hint="현재 발견된 ROS2 서비스 수" />
        </div>

        <Panel>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1.2rem',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#1F2937' }}>필수 토픽 확인</h3>
              <p style={{ marginTop: '0.6rem', fontSize: '1.3rem', color: '#667085' }}>
                향후 LiDAR, IMU, Camera, Battery 테스트에 사용할 대표 토픽의 존재 여부를 표시합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={fetchStatus}
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

          <div
            style={{
              marginTop: '1.8rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '1rem'
            }}
          >
            {requiredTopics.map((topic) => (
              <div
                key={topic.name}
                style={{
                  border: '1px solid #E3E8EF',
                  background: '#F8FAFC',
                  borderRadius: '1.4rem',
                  padding: '1.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <span style={{ fontSize: '1.3rem', color: '#1F2937', fontWeight: 800 }}>{topic.name}</span>
                <StatusBadge tone={topic.available ? 'green' : 'gray'}>
                  {topic.available ? '확인됨' : '미수신'}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <ListPanel
            title="ROS2 Nodes"
            items={nodePreview}
            emptyText="검색된 노드가 없습니다."
            renderItem={(node) => (
              <div
                key={node}
                style={{
                  border: '1px solid #E3E8EF',
                  borderRadius: '1.2rem',
                  padding: '1.2rem 1.4rem',
                  color: '#1F2937',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  background: '#FFFFFF'
                }}
              >
                {node}
              </div>
            )}
          />

          <ListPanel
            title="ROS2 Topics"
            items={topicPreview}
            emptyText="검색된 토픽이 없습니다."
            renderItem={(topic) => (
              <div
                key={topic.name}
                style={{
                  border: '1px solid #E3E8EF',
                  borderRadius: '1.2rem',
                  padding: '1.2rem 1.4rem',
                  background: '#FFFFFF'
                }}
              >
                <div style={{ color: '#1F2937', fontSize: '1.3rem', fontWeight: 900 }}>{topic.name}</div>
                <div style={{ marginTop: '0.4rem', color: '#8A94A6', fontSize: '1.15rem' }}>
                  {(topic.types || []).join(', ')}
                </div>
              </div>
            )}
          />
        </div>
      </Section>
    </StyledPageContent>
  )
}

export default Ros2Status
