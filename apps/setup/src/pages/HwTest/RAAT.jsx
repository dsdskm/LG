import React, { useEffect, useMemo, useState } from 'react'
import { StyledPageContent } from './styles'
import { Section, Title } from '@repo/ui'
import { getBatteryStatus, getTurtlePose, getTurtleMotion, setTurtleMotion } from '../../apis/raat'

const StatusBadge = ({ children, tone = 'gray' }) => {
  const styleMap = {
    green: {
      background: '#E8F7EF',
      color: '#178A4B',
      border: '#BFE8D0'
    },
    red: {
      background: '#FDECEC',
      color: '#C43D3D',
      border: '#F4B9B9'
    },
    blue: {
      background: '#EAF6FB',
      color: '#1681A7',
      border: '#BCE5F3'
    },
    orange: {
      background: '#FFF4E5',
      color: '#B76A00',
      border: '#FFD79A'
    },
    gray: {
      background: '#F3F5F8',
      color: '#667085',
      border: '#D9DEE7'
    }
  }

  const s = styleMap[tone] || styleMap.gray

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '0.45rem 0.9rem',
        fontSize: '1.2rem',
        fontWeight: 700,
        background: s.background,
        color: s.color,
        border: `1px solid ${s.border}`
      }}
    >
      {children}
    </span>
  )
}

const MetricCard = ({ label, value, unit, hint }) => {
  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E3E8EF',
        borderRadius: '1.6rem',
        padding: '1.8rem'
      }}
    >
      <div style={{ fontSize: '1.25rem', color: '#667085', fontWeight: 700 }}>{label}</div>
      <div
        style={{
          marginTop: '0.8rem',
          fontSize: '2.4rem',
          fontWeight: 800,
          color: '#1F2937'
        }}
      >
        {value ?? '-'}
        {unit && value !== undefined && value !== null ? (
          <span style={{ fontSize: '1.4rem', marginLeft: '0.4rem', color: '#667085' }}>{unit}</span>
        ) : null}
      </div>
      {hint ? <div style={{ marginTop: '0.6rem', fontSize: '1.2rem', color: '#8A94A6' }}>{hint}</div> : null}
    </div>
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

const RAAT = () => {
  const [battery, setBattery] = useState(null)
  const [pose, setPose] = useState(null)

  const [batteryLoading, setBatteryLoading] = useState(false)
  const [poseAutoRefresh, setPoseAutoRefresh] = useState(true)
  const [turtleMotionEnabled, setTurtleMotionEnabled] = useState(false)
  const [turtleMotionLoading, setTurtleMotionLoading] = useState(false)
  const [error, setError] = useState('')

  const reconnectUrl = useMemo(() => {
    return `${window.location.protocol}//${window.location.hostname}:5177/hwTest/raat`
  }, [])

  const fetchBattery = async () => {
    setBatteryLoading(true)
    setError('')

    try {
      const data = await getBatteryStatus()
      setBattery(data)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setBatteryLoading(false)
    }
  }

  const fetchPose = async () => {
    try {
      const data = await getTurtlePose()
      setPose(data)
    } catch (e) {
      setError(e?.message || String(e))
    }
  }

  const fetchTurtleMotion = async () => {
    try {
      const data = await getTurtleMotion()
      setTurtleMotionEnabled(!!data.enabled)
    } catch (e) {
      setError(e?.message || String(e))
    }
  }

  const toggleTurtleMotion = async () => {
    const nextEnabled = !turtleMotionEnabled
    setTurtleMotionLoading(true)
    setError('')

    try {
      const data = await setTurtleMotion(nextEnabled)
      if (!data.success) {
        throw new Error(data.error || '터틀봇 이동 명령 실패')
      }
      setTurtleMotionEnabled(!!data.enabled)
      fetchPose()
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setTurtleMotionLoading(false)
    }
  }

  useEffect(() => {
    fetchBattery()
    fetchPose()
  }, [])

  useEffect(() => {
    if (!poseAutoRefresh) return

    const timer = setInterval(() => {
      fetchPose()
    }, 500)

    return () => clearInterval(timer)
  }, [poseAutoRefresh])

  const batteryTone = !battery?.available ? 'gray' : battery?.normal ? 'green' : 'red'

  const batteryLabel = !battery?.available ? '수신 대기' : battery?.normal ? '정상' : '비정상'

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
            <p
              style={{
                marginTop: '0.8rem',
                fontSize: '1.4rem',
                lineHeight: 1.6,
                color: '#667085'
              }}
            >
              ROS2 토픽을 기반으로 로봇 상태와 테스트 데이터를 확인합니다.
            </p>
          </div>

          <StatusBadge tone="blue">ROS2 Monitor</StatusBadge>
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
              fontWeight: 700
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem'
          }}
        >
          {/* Battery */}
          <Panel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1.2rem',
                alignItems: 'center',
                marginBottom: '2rem'
              }}
            >
              <div>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#1F2937' }}>배터리 상태 확인</h3>
                <p
                  style={{
                    marginTop: '0.6rem',
                    fontSize: '1.3rem',
                    color: '#667085'
                  }}
                >
                  /battery_state 토픽을 확인하여 배터리 레벨과 상태를 표시합니다.
                </p>
              </div>

              <StatusBadge tone={batteryTone}>{batteryLabel}</StatusBadge>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '1.2rem'
              }}
            >
              <MetricCard
                label="배터리 레벨"
                value={battery?.level}
                unit="%"
                hint={battery?.available ? battery?.reason : '토픽 수신 대기 중'}
              />
              <MetricCard label="전압" value={battery?.voltage} unit="V" hint="sensor_msgs/BatteryState" />
              <MetricCard
                label="전원 상태"
                value={battery?.power_supply_status_text}
                hint={battery?.topic || '/battery_state'}
              />
            </div>

            <div style={{ marginTop: '1.8rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={fetchBattery}
                disabled={batteryLoading}
                style={{
                  border: 'none',
                  borderRadius: '1.2rem',
                  background: batteryLoading ? '#CBD5E1' : '#5DB7D8',
                  color: 'white',
                  padding: '1.1rem 1.8rem',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  cursor: batteryLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {batteryLoading ? '확인 중...' : '배터리 확인'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.25rem',
                  color: '#8A94A6'
                }}
              >
                최근 갱신: {battery?.updated_age_sec ?? '-'}초 전
              </div>
            </div>
          </Panel>

          {/* Pose */}
          <Panel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1.2rem',
                alignItems: 'center',
                marginBottom: '2rem'
              }}
            >
              <div>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#1F2937' }}>ROS2 상태 확인</h3>
                <p
                  style={{
                    marginTop: '0.6rem',
                    fontSize: '1.3rem',
                    color: '#667085'
                  }}
                >
                  turtlesim의 /turtle1/pose 토픽을 실시간으로 표시합니다.
                </p>
              </div>

              <StatusBadge tone={pose?.available ? 'green' : 'orange'}>
                {pose?.available ? '수신 중' : '대기 중'}
              </StatusBadge>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '1.2rem'
              }}
            >
              <MetricCard label="X" value={pose?.x} />
              <MetricCard label="Y" value={pose?.y} />
              <MetricCard label="Theta" value={pose?.theta} />
              <MetricCard label="Linear" value={pose?.linear_velocity} />
              <MetricCard label="Angular" value={pose?.angular_velocity} />
            </div>

            <div
              style={{
                marginTop: '1.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={fetchPose}
                  style={{
                    border: '1px solid #B8DDEA',
                    borderRadius: '1.2rem',
                    background: '#EAF6FB',
                    color: '#1681A7',
                    padding: '1.1rem 1.8rem',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  좌표 새로고침
                </button>

                <button
                  onClick={() => setPoseAutoRefresh((v) => !v)}
                  style={{
                    border: '1px solid #E1E6EF',
                    borderRadius: '1.2rem',
                    background: poseAutoRefresh ? '#F8FAFC' : '#FFFFFF',
                    color: '#475467',
                    padding: '1.1rem 1.8rem',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  실시간 표시 {poseAutoRefresh ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={toggleTurtleMotion}
                  disabled={turtleMotionLoading}
                  style={{
                    border: 'none',
                    borderRadius: '1.2rem',
                    background: turtleMotionEnabled ? '#EF4444' : '#5DB7D8',
                    color: 'white',
                    padding: '1.1rem 1.8rem',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    cursor: turtleMotionLoading ? 'not-allowed' : 'pointer',
                    opacity: turtleMotionLoading ? 0.7 : 1
                  }}
                >
                  {turtleMotionLoading ? '명령 전송 중...' : turtleMotionEnabled ? '터틀봇 정지' : '터틀봇 이동'}
                </button>
              </div>

              <div style={{ fontSize: '1.25rem', color: '#8A94A6' }}>
                Topic: {pose?.topic || '/turtle1/pose'} · Motion: {turtleMotionEnabled ? 'ON' : 'OFF'} · 최근 갱신:{' '}
                {pose?.updated_age_sec ?? '-'}초 전
              </div>
            </div>
          </Panel>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E1E6EF',
              borderRadius: '1.6rem',
              padding: '1.6rem',
              color: '#667085',
              fontSize: '1.25rem',
              lineHeight: 1.7
            }}
          >
            접속 주소: <b>{reconnectUrl}</b>
            <br />
            같은 네트워크의 PC/폰에서 이 페이지에 접속하면 ROS2 상태를 확인할 수 있습니다.
          </div>
        </div>
      </Section>
    </StyledPageContent>
  )
}

export default RAAT
