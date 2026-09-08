import React from 'react'
import { Checkbox, Section, SectionTitle } from '@repo/ui'
import { SPATIAL_TOPICS, subscribedTopicOf } from '@/constants/topics'
import {
  CategoryHeader,
  CategoryTitle,
  EmptyText,
  FixedBlock,
  GrowBlock,
  InfoBlockTitle,
  InfoBlockWrap,
  JsonWrap,
  LegendLabel,
  LegendRow,
  LegendSwatch,
  Panel,
  RowLabel,
  RowValue,
  RowWrap,
  ScrollArea,
  TopicContainer,
  TopicLabel,
  TopicName,
  TopicRow,
  TransformFrame,
  TransformItem,
  TransformList
} from './styles'

/**
 * StatusPanel
 *
 * 우측 사이드바: 연결 정보, 로봇 위치(Odometry), 라이다 통계,
 * 지도(OccupancyGrid) 메타데이터, 매핑 상태를 표시하는 컴포넌트.
 * 토픽 이름은 로봇 구성에 따라 다르므로(@/constants/topics) 역할로 판단한다.
 *
 * 토픽 정보 / 토픽 목록 / 범례를 각각 별도의 공용 Section(카드)으로 쌓는다.
 * 앞의 두 카드는 남는 높이를 나눠 갖고 내부에서 스크롤하며, 범례는 내용 높이로 고정된다.
 * (파일 안의 InfoBlock 은 카드 내부에서 토픽별 상세를 구분하는 작은 블록으로, 공용 Section 과 다르다.)
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
    <Panel>
      {/* ── 토픽 정보 Section ─────────────────────────────────── */}
      <GrowBlock>
        <Section>
          <SectionTitle title={t('topicInfo')} />
          <ScrollArea>
            {/* ── 기하 정보 요약 카드 ────────────────────────────────── */}

            {/* 1) 지도 정보 (OccupancyGrid) */}
            {mapTopic && (
              <InfoBlock title={`${mapTopic} — ${t('mapInfo')}`}>
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
              </InfoBlock>
            )}

            {/* 2) 로봇 위치 (Odometry) */}
            {odomTopic && (
              <InfoBlock title={`${odomTopic} — ${t('robotPosition')}`}>
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
              </InfoBlock>
            )}

            {/* 3) 라이다 정보 (PointCloud2 / LaserScan) */}
            {scanTopic && (
              <InfoBlock title={`${scanTopic} — ${t('lidarInfo')}`}>
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
              </InfoBlock>
            )}

            {/* 매핑/측위 진행 상태(/lio_node/status)는 여기 두지 않는다 —
                한눈에 보여야 해서 페이지 상단 위치 선택 줄 오른쪽 배지로 옮겼다. */}

            {/* 4) 시작 지점 (/initialpose) */}
            {subscribedTopics.includes('/initialpose') && (
              <InfoBlock title={`/initialpose`}>
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
              </InfoBlock>
            )}

            {/* 5) 목표 지점 (/goal_pose) */}
            {subscribedTopics.includes('/goal_pose') && (
              <InfoBlock title={`/goal_pose`}>
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
              </InfoBlock>
            )}

            {/* 6) 좌표 변환 (/tf & /tf_static) */}
            {subscribedTopics.includes('/tf') && (
              <InfoBlock title={`/tf`}>
                {(() => {
                  const tfData = customTopicsData['/tf']
                  if (!tfData || !Array.isArray(tfData.transforms) || tfData.transforms.length === 0) {
                    return <Empty text={t('waitingForData')} />
                  }
                  return (
                    <TransformList>
                      {tfData.transforms.map((t, idx) => {
                        const trans = t.transform?.translation ?? { x: 0, y: 0, z: 0 }
                        const child = t.child_frame_id ?? `frame_${idx}`
                        return (
                          <TransformItem key={idx}>
                            <TransformFrame>{child}</TransformFrame>
                            <Row label="Offset (X/Y)" value={`${trans.x.toFixed(2)} / ${trans.y.toFixed(2)} m`} />
                          </TransformItem>
                        )
                      })}
                    </TransformList>
                  )
                })()}
              </InfoBlock>
            )}

            {subscribedTopics.includes('/tf_static') && (
              <InfoBlock title={`/tf_static`}>
                {(() => {
                  const tfData = customTopicsData['/tf_static']
                  if (!tfData || !Array.isArray(tfData.transforms) || tfData.transforms.length === 0) {
                    return <Empty text={t('waitingForData')} />
                  }
                  return (
                    <TransformList>
                      {tfData.transforms.map((t, idx) => {
                        const trans = t.transform?.translation ?? { x: 0, y: 0, z: 0 }
                        const child = t.child_frame_id ?? `frame_${idx}`
                        return (
                          <TransformItem key={idx}>
                            <TransformFrame>{child}</TransformFrame>
                            <Row label="Offset (X/Y)" value={`${trans.x.toFixed(2)} / ${trans.y.toFixed(2)} m`} />
                          </TransformItem>
                        )
                      })}
                    </TransformList>
                  )
                })()}
              </InfoBlock>
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
                  <InfoBlock key={topic} title={topic}>
                    {data ? (
                      <JsonWrap>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                      </JsonWrap>
                    ) : (
                      <Empty text={t('waitingForData')} />
                    )}
                  </InfoBlock>
                )
              })}
          </ScrollArea>
        </Section>
      </GrowBlock>

      {/* ── 토픽 목록 Section ─────────────────────────────────── */}
      <GrowBlock>
        <Section>
          <SectionTitle title={t('topicList')} />
          <ScrollArea>
            {topics && topics.length > 0 ? (
              <div>
                {/* 기하 정보 카테고리 */}
                <CategoryHeader>
                  <Checkbox checked={isAllSpatialSubscribed} onChange={handleToggleSpatial} />
                  <CategoryTitle>{t('spatialInfo')}</CategoryTitle>
                </CategoryHeader>
                <TopicContainer $spaced>
                  {availableSpatial.map((topic) => {
                    const isSubscribed = subscribedTopics.includes(topic)
                    return (
                      <TopicRow key={topic}>
                        <TopicLabel>
                          <Checkbox checked={isSubscribed} onChange={() => toggleSubscribe(topic)} />
                          <TopicName title={topic}>{topic}</TopicName>
                        </TopicLabel>
                      </TopicRow>
                    )
                  })}
                </TopicContainer>

                {/* 텍스트 정보 카테고리 */}
                <CategoryHeader>
                  <Checkbox checked={isAllTextSubscribed} onChange={handleToggleText} />
                  <CategoryTitle>{t('textInfo')}</CategoryTitle>
                </CategoryHeader>
                <TopicContainer>
                  {availableText.map((topic) => {
                    const isSubscribed = subscribedTopics.includes(topic)
                    return (
                      <TopicRow key={topic}>
                        <TopicLabel>
                          <Checkbox checked={isSubscribed} onChange={() => toggleSubscribe(topic)} />
                          <TopicName title={topic}>{topic}</TopicName>
                        </TopicLabel>
                      </TopicRow>
                    )
                  })}
                </TopicContainer>
              </div>
            ) : (
              <Empty text={t('waitingForData')} />
            )}
          </ScrollArea>
        </Section>
      </GrowBlock>

      {/* ── 범례 Section (내용 높이로 고정) ────────────────────── */}
      <FixedBlock>
        <Section>
          <SectionTitle title={t('legend')} />
          <Legend color="#cccccc" label={t('unknown')} />
          <Legend color="#ffffff" label={t('freeSpace')} />
          <Legend color="#333333" label={t('obstacle')} />
          <Legend color="rgba(231,76,60,0.7)" label={`${t('laserPoint')}`} />
          <Legend color="rgba(41,128,185,0.85)" label={t('robotCurrentPosition')} />
        </Section>
      </FixedBlock>
    </Panel>
  )
}

// ── 서브 컴포넌트들 ──────────────────────────────────────────────────────────

function InfoBlock({ title, children }) {
  return (
    <InfoBlockWrap>
      <InfoBlockTitle>{title}</InfoBlockTitle>
      <div>{children}</div>
    </InfoBlockWrap>
  )
}

function Row({ label, value, mono, highlight }) {
  return (
    <RowWrap>
      <RowLabel>{label}</RowLabel>
      {/* 값 색은 강조 종류로만 정한다(styles.js ROW_VALUE_COLOR) */}
      <RowValue $highlight={highlight} $mono={mono}>
        {value}
      </RowValue>
    </RowWrap>
  )
}

function Empty({ text }) {
  return <EmptyText>{text}</EmptyText>
}

function Legend({ color, label, border }) {
  return (
    <LegendRow>
      <LegendSwatch $color={color} $bordered={border} />
      <LegendLabel>{label}</LegendLabel>
    </LegendRow>
  )
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
