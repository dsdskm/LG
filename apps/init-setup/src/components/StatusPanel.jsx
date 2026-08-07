import React from 'react'
import { Checkbox } from '@repo/ui'
import { SPATIAL_TOPICS, STATUS_TOPICS, subscribedTopicOf } from '@/constants/topics'

/**
 * StatusPanel
 *
 * 우측 사이드바: 연결 정보, 로봇 위치(Odometry), 라이다 통계,
 * 지도(OccupancyGrid) 메타데이터, 매핑 상태를 표시하는 컴포넌트.
 * 토픽 이름은 로봇 구성에 따라 다르므로(@/constants/topics) 역할로 판단한다.
 */
function StatusPanel({
  status,
  mapData,
  odomData,
  scanData,
  topics = [],
  subscribedTopics = [],
  customTopicsData = {},
  toggleSubscribe,
  subscribeTopics,
  unsubscribeTopics,
  wsUrl,
  t
}) {
  const quatToYawDeg = (q) => {
    if (!q) return 0
    const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
    return (yaw * 180) / Math.PI
  }

  // 현재 구독 중인 역할별 토픽 이름 (LIO / Cartographer 등 구성에 따라 달라진다)
  const mapTopic = subscribedTopicOf(subscribedTopics, 'map')
  const odomTopic = subscribedTopicOf(subscribedTopics, 'odom')
  const scanTopic = subscribedTopicOf(subscribedTopics, 'scan')
  const statusTopic = STATUS_TOPICS.find((topic) => subscribedTopics.includes(topic)) ?? null

  const availableSpatial = topics.filter((t) => SPATIAL_TOPICS.includes(t))
  const availableText = topics.filter((t) => !SPATIAL_TOPICS.includes(t))

  const isAllSpatialSubscribed =
    availableSpatial.length > 0 && availableSpatial.every((t) => subscribedTopics.includes(t))
  const isAllTextSubscribed = availableText.length > 0 && availableText.every((t) => subscribedTopics.includes(t))

  const handleToggleSpatial = () => {
    if (isAllSpatialSubscribed) {
      unsubscribeTopics(availableSpatial)
    } else {
      subscribeTopics(availableSpatial)
    }
  }

  const handleToggleText = () => {
    if (isAllTextSubscribed) {
      unsubscribeTopics(availableText)
    } else {
      subscribeTopics(availableText)
    }
  }

  return (
    <div style={styles.panel}>
      {/* 상단 스크롤 영역 */}
      <Section title={t('topicInfo')} style={styles.topicInfoSection}></Section>
      <div style={styles.scrollArea}>
        {/* ── 기하 정보 요약 카드 ────────────────────────────────── */}

        {/* 1) 지도 정보 (OccupancyGrid) */}
        {mapTopic && (
          <Section title={`${mapTopic} — ${t('mapInfo')}`}>
            {mapData ? (
              <>
                <Row label={t('resolution')} value={`${mapData.info.resolution.toFixed(2)} m/cell`} />
                <Row label={t('size')} value={`${mapData.info.width} × ${mapData.info.height} cells`} />
                <Row
                  label={t('realSize')}
                  value={
                    `${(mapData.info.width * mapData.info.resolution).toFixed(2)} × ` +
                    `${(mapData.info.height * mapData.info.resolution).toFixed(2)} m`
                  }
                />
                <Row label="Frame" value={mapData.header?.frame_id ?? '-'} mono />
              </>
            ) : (
              <Empty text={t('waitingForData')} />
            )}
          </Section>
        )}

        {/* 2) 로봇 위치 (Odometry) */}
        {odomTopic && (
          <Section title={`${odomTopic} — ${t('robotPosition')}`}>
            {odomData ? (
              (() => {
                const pos = odomData.pose?.pose?.position
                const quat = odomData.pose?.pose?.orientation
                const vel = odomData.twist?.twist?.linear
                return (
                  <>
                    <Row label="X" value={pos ? `${pos.x.toFixed(3)} m` : '-'} />
                    <Row label="Y" value={pos ? `${pos.y.toFixed(3)} m` : '-'} />
                    <Row label="Yaw" value={quat ? `${quatToYawDeg(quat).toFixed(1)} °` : '-'} />
                    <Row label={t('speed')} value={vel ? `${vel.x.toFixed(3)} m/s` : '-'} />
                  </>
                )
              })()
            ) : (
              <Empty text={t('waitingForData')} />
            )}
          </Section>
        )}

        {/* 3) 라이다 정보 (PointCloud2 / LaserScan) */}
        {scanTopic && (
          <Section title={`${scanTopic} — ${t('lidarInfo')}`}>
            {scanData ? (
              (() => {
                if (Array.isArray(scanData.points)) {
                  const ptCount = scanData.points.length
                  // 로봇 원점으로부터 각 점까지의 거리 계산
                  const distances = scanData.points
                    .map((pt) => Math.sqrt(pt.x * pt.x + pt.y * pt.y))
                    .filter((d) => isFinite(d) && d > 0)
                  const minRange = distances.length ? Math.min(...distances).toFixed(2) : '-'
                  const maxRangeVal = distances.length ? Math.max(...distances).toFixed(2) : '-'
                  return (
                    <>
                      <Row label={t('pointCount')} value={`${ptCount} pts`} />
                      <Row label={t('minDistance')} value={`${minRange} m`} />
                      <Row label={t('maxDistance')} value={`${maxRangeVal} m`} />
                    </>
                  )
                }

                const scanRanges = scanData.ranges ?? []
                const validRanges = scanRanges.filter((r) => isFinite(r) && r > 0)
                const minRange = validRanges.length ? Math.min(...validRanges).toFixed(2) : '-'
                const maxRangeVal = validRanges.length ? Math.max(...validRanges).toFixed(2) : '-'
                return (
                  <>
                    <Row label={t('pointCount')} value={`${scanRanges.length} rays`} />
                    <Row label={t('validPointCount')} value={`${validRanges.length} rays`} />
                    <Row label={t('minDistance')} value={`${minRange} m`} />
                    <Row label={t('maxDistance')} value={`${maxRangeVal} m`} />
                  </>
                )
              })()
            ) : (
              <Empty text={t('waitingForData')} />
            )}
          </Section>
        )}

        {/* 3-1) 매핑/측위 진행 상태 (std_msgs/String) */}
        {statusTopic && (
          <Section title={`${statusTopic} — ${t('mappingStatus')}`}>
            {(() => {
              const value = customTopicsData[statusTopic]?.data
              if (!value) return <Empty text={t('waitingForData')} />
              return <Row label={t('status')} value={value} mono />
            })()}
          </Section>
        )}

        {/* 4) 시작 지점 (/initialpose) */}
        {subscribedTopics.includes('/initialpose') && (
          <Section title={`/initialpose`}>
            {(() => {
              const initData = customTopicsData['/initialpose']
              if (!initData) return <Empty text={t('waitingForData')} />
              const pose = initData.pose?.pose?.position ?? initData.pose?.position ?? initData
              const quat = initData.pose?.pose?.orientation ?? initData.pose?.orientation
              return (
                <>
                  <Row label="X" value={typeof pose?.x === 'number' ? `${pose.x.toFixed(3)} m` : '-'} />
                  <Row label="Y" value={typeof pose?.y === 'number' ? `${pose.y.toFixed(3)} m` : '-'} />
                  <Row label="Yaw" value={quat ? `${quatToYawDeg(quat).toFixed(1)} °` : '-'} />
                </>
              )
            })()}
          </Section>
        )}

        {/* 5) 목표 지점 (/goal_pose) */}
        {subscribedTopics.includes('/goal_pose') && (
          <Section title={`/goal_pose`}>
            {(() => {
              const goalData = customTopicsData['/goal_pose']
              if (!goalData) return <Empty text={t('waitingForData')} />
              const pose = goalData.pose?.position ?? goalData.position ?? goalData
              const quat = goalData.pose?.orientation ?? goalData.orientation
              return (
                <>
                  <Row label="X" value={typeof pose?.x === 'number' ? `${pose.x.toFixed(3)} m` : '-'} />
                  <Row label="Y" value={typeof pose?.y === 'number' ? `${pose.y.toFixed(3)} m` : '-'} />
                  <Row label="Yaw" value={quat ? `${quatToYawDeg(quat).toFixed(1)} °` : '-'} />
                </>
              )
            })()}
          </Section>
        )}

        {/* 6) 좌표 변환 (/tf & /tf_static) */}
        {subscribedTopics.includes('/tf') && (
          <Section title={`/tf`}>
            {(() => {
              const tfData = customTopicsData['/tf']
              if (!tfData || !Array.isArray(tfData.transforms) || tfData.transforms.length === 0) {
                return <Empty text={t('waitingForData')} />
              }
              return (
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {tfData.transforms.map((t, idx) => {
                    const trans = t.transform?.translation ?? { x: 0, y: 0, z: 0 }
                    const child = t.child_frame_id ?? `frame_${idx}`
                    return (
                      <div key={idx} style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 4, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 'bold', color: '#555', fontFamily: 'monospace' }}>
                          {child}
                        </div>
                        <Row label="Offset (X/Y)" value={`${trans.x.toFixed(2)} / ${trans.y.toFixed(2)} m`} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Section>
        )}

        {subscribedTopics.includes('/tf_static') && (
          <Section title={`/tf_static`}>
            {(() => {
              const tfData = customTopicsData['/tf_static']
              if (!tfData || !Array.isArray(tfData.transforms) || tfData.transforms.length === 0) {
                return <Empty text={t('waitingForData')} />
              }
              return (
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {tfData.transforms.map((t, idx) => {
                    const trans = t.transform?.translation ?? { x: 0, y: 0, z: 0 }
                    const child = t.child_frame_id ?? `frame_${idx}`
                    return (
                      <div key={idx} style={{ borderBottom: '1px solid #f2f2f2', paddingBottom: 4, marginBottom: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 'bold', color: '#555', fontFamily: 'monospace' }}>
                          {child}
                        </div>
                        <Row label="Offset (X/Y)" value={`${trans.x.toFixed(2)} / ${trans.y.toFixed(2)} m`} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Section>
        )}

        {/* JSON 정보 토픽 데이터 표시 */}
        {subscribedTopics
          .filter((topic) =>
            [
              '/rosout',
              '/parameter_events',
              '/robot_description',
              '/joint_states',
              '/clock',
              '/submap_list',
              '/lidar_imu',
              '/events/read_split'
            ].includes(topic)
          )
          .map((topic) => {
            const data = customTopicsData[topic]
            return (
              <Section key={topic} title={topic}>
                {data ? (
                  <div style={styles.jsonWrap}>
                    <pre style={styles.jsonPre}>{JSON.stringify(data, null, 2)}</pre>
                  </div>
                ) : (
                  <Empty text={t('waitingForData')} />
                )}
              </Section>
            )
          })}
      </div>

      {/* 하단 고정 영역 */}
      <div style={styles.bottomArea}>
        {/* 토픽 목록 */}
        <Section title={t('topicList')} style={styles.topicListSection} />
        <Section>
          {topics && topics.length > 0 ? (
            <div>
              {/* 기하 정보 카테고리 */}
              <label style={styles.categoryHeaderLabel}>
                <Checkbox checked={isAllSpatialSubscribed} onChange={handleToggleSpatial} style={styles.checkbox} />
                <span style={styles.categoryTitle}>{t('spatialInfo')}</span>
              </label>
              <div style={{ ...styles.topicContainer, marginBottom: 12 }}>
                {availableSpatial
                  .map((topic) => {
                    const isSubscribed = subscribedTopics.includes(topic)
                    return (
                      <div key={topic} style={styles.topicRow}>
                        <label style={styles.topicLabel}>
                          <Checkbox
                            checked={isSubscribed}
                            onChange={() => toggleSubscribe(topic)}
                            style={styles.checkbox}
                          />
                          <span style={styles.topicName} title={topic}>
                            {topic}
                          </span>
                        </label>
                      </div>
                    )
                  })}
              </div>

              {/* 텍스트 정보 카테고리 */}
              <label style={styles.categoryHeaderLabel}>
                <Checkbox checked={isAllTextSubscribed} onChange={handleToggleText} style={styles.checkbox} />
                <span style={styles.categoryTitle}>{t('textInfo')}</span>
              </label>
              <div style={styles.topicContainer}>
                {availableText
                  .map((topic) => {
                    const isSubscribed = subscribedTopics.includes(topic)
                    return (
                      <div key={topic} style={styles.topicRow}>
                        <label style={styles.topicLabel}>
                          <Checkbox
                            checked={isSubscribed}
                            onChange={() => toggleSubscribe(topic)}
                            style={styles.checkbox}
                          />
                          <span style={styles.topicName} title={topic}>
                            {topic}
                          </span>
                        </label>
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : (
            <Empty text={t('waitingForData')} />
          )}
        </Section>
      </div>

      {/* 범례 (하단 고정) */}
      <div style={styles.legendArea}>
        <Section title={t('legend')} style={styles.legendSection} />
        <Section>
          <Legend color="#cccccc" label={t('unknown')} />
          <Legend color="#ffffff" label={t('freeSpace')} />
          <Legend color="#333333" label={t('obstacle')} />
          <Legend color="rgba(231,76,60,0.7)" label={`${t('laserPoint')}`} />
          <Legend color="rgba(41,128,185,0.85)" label={t('robotCurrentPosition')} />
        </Section>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트들 ──────────────────────────────────────────────────────────

function Section({ title, children, style }) {
  return (
    <div style={{ ...sectionStyle.wrap, ...style }}>
      <div style={sectionStyle.title}>{title}</div>
      <div style={sectionStyle.body}>{children}</div>
    </div>
  )
}

// ... (나머지 헬퍼 함수들 및 스타일 객체)
function Row({ label, value, mono, highlight }) {
  const valueColor =
    highlight === 'green' ? '#27ae60' : highlight === 'red' ? '#e74c3c' : highlight === 'gray' ? '#888' : '#222'

  return (
    <div style={rowStyle.row}>
      <span style={rowStyle.label}>{label}</span>
      <span style={{ ...rowStyle.value, color: valueColor, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ color: '#aaa', fontSize: 12, padding: '4px 0' }}>{text}</div>
}

function Legend({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          background: color,
          border: border ? '1px solid #ccc' : 'none',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
          flexShrink: 0
        }}
      />
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  )
}

// ── 스타일 ───────────────────────────────────────────────────────────────────

const styles = {
  topicInfoSection: {
    backgroundColor: '#ebf8ff',
    borderBottom: '1px solid #bee3f8'
  },
  topicListSection: {
    backgroundColor: '#f0fff4',
    borderBottom: '1px solid #c6f6d5'
  },
  legendSection: {
    backgroundColor: '#fff0f0',
    borderBottom: '1px solid #ffd6d6'
  },
  panel: {
    width: 240,
    flexShrink: 0,
    background: '#fff',
    borderLeft: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box'
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
    minHeight: 0
  },
  bottomArea: {
    borderTop: '1px solid #eee',
    background: '#fff',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0
  },
  legendArea: {
    borderTop: '1px solid #eee',
    background: '#fff',
    flexShrink: 0
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10
  },
  actionBtn: {
    flex: 1,
    padding: '5px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#4a5568',
    background: '#edf2f7',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
    outline: 'none'
  },
  topicContainer: {
    maxHeight: '240px',
    overflowY: 'auto',
    border: '1px solid #eee',
    borderRadius: 4,
    padding: '4px 6px',
    background: '#fafafa'
  },
  categoryHeaderLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none',
    marginTop: 6,
    marginBottom: 4
  },
  categoryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  topicRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '3px 0',
    borderBottom: '1px solid #f2f2f2'
  },
  topicLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkbox: {
    cursor: 'pointer',
    width: 14,
    height: 14,
    margin: 0,
    accentColor: '#2ecc71'
  },
  topicName: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1
  },
  jsonWrap: {
    maxHeight: 150,
    overflowY: 'auto',
    background: '#2d3748',
    color: '#a0aec0',
    padding: 8,
    borderRadius: 4,
    border: '1px solid #4a5568'
  },
  jsonPre: {
    margin: 0,
    fontSize: 10,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  }
}

const sectionStyle = {
  wrap: { padding: '8px 12px', borderBottom: '1px solid #eee' },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2980b9',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5
  },
  body: {}
}

const rowStyle = {
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 4 },
  label: { fontSize: 12, color: '#666', flexShrink: 0 },
  value: { fontSize: 12, textAlign: 'right', wordBreak: 'break-all' }
}

const MemoizedStatusPanel = React.memo(StatusPanel, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.wsUrl !== nextProps.wsUrl) return false
  if (prevProps.mapData !== nextProps.mapData) return false
  if (prevProps.odomData !== nextProps.odomData) return false
  if (prevProps.scanData !== nextProps.scanData) return false
  if (prevProps.topics !== nextProps.topics) return false
  if (prevProps.subscribedTopics !== nextProps.subscribedTopics) return false
  if (prevProps.toggleSubscribe !== nextProps.toggleSubscribe) return false
  if (prevProps.subscribeTopics !== nextProps.subscribeTopics) return false
  if (prevProps.unsubscribeTopics !== nextProps.unsubscribeTopics) return false
  if (prevProps.subscribeAll !== nextProps.subscribeAll) return false
  if (prevProps.unsubscribeAll !== nextProps.unsubscribeAll) return false
  if (prevProps.t !== nextProps.t) return false

  // Check only relevant keys in customTopicsData
  const relevantKeys = [
    '/initialpose',
    '/goal_pose',
    '/tf',
    '/tf_static',
    '/rosout',
    '/parameter_events',
    '/robot_description',
    '/joint_states',
    '/clock',
    '/submap_list',
    '/lidar_imu',
    '/events/read_split'
  ]

  for (const key of relevantKeys) {
    if (prevProps.customTopicsData[key] !== nextProps.customTopicsData[key]) {
      return false
    }
  }

  return true
})

export default MemoizedStatusPanel
