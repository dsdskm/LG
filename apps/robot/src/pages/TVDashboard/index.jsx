import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import forgeLogoSvg from '@/assets/image/svg/PhysicalWorksForge.svg?raw'
import lgBrandSvg from '@/assets/image/svg/LGBrand.svg?raw'
import headerLgBg from '@/assets/image/tvbg/header_lg.png'
import { deviceApis, siteApis, mapApis } from '@/apis'
import { parseRobotData } from '@/utils/robotUtils'
import DataCollectionSection from '../Dashboard/components/DataCollectionSection'
import RobotStateCards from '../Dashboard/components/RobotStateCards'
import Location from '../Dashboard/KakaoMap'
import SiteMap3D from '../../common/SiteMap3D'

// ── 기준 해상도 (Figma 프레임 = 1920×1080 과 1:1) ─────────────────
const BASE_W = 1920
const BASE_H = 1080

// ── 폰트 (Figma: LG Smart UI / LG EI Headline) ───────────────────
const FONT_UI = "'LG Smart UI', 'Noto Sans KR', sans-serif"
const FONT_HEAD = "'LG EI Headline', 'LG Smart UI', 'Noto Sans KR', sans-serif"

// ── Figma 색상 토큰 ──────────────────────────────────────────────
const HEADER_GRAD = 'linear-gradient(90deg, #999181 0%, #6e6658 100%)'
const BODY_BG = '#f1efed'
const CARD_BG = '#ffffff'
const TITLE_COLOR = '#181818'
const GREEN = '#22a56c'
const CRIMSON = '#b91c4c'

// ── 컬러 모드 (Figma 2개 컨셉) ───────────────────────────────────
// solid: 흰색 헤더 + 골드/탄 그래프 / gradient: LG 레드 그라데이션 헤더 + 크림슨 그래프
// (LG 그라데이션 헤더는 Figma가 raster 이미지라 LG 레드 #A50034 그라데이션으로 근사)
const COLOR_MODES = {
  // LG Gradient: Figma 원본 그라데이션 이미지 헤더/바디 + 회색 톤 차트
  gradient: {
    headerBg: `url(${headerLgBg}) center / cover no-repeat`,
    // 바디: 동일 이미지를 흰색 42% 오버레이로 덮어 Figma의 opacity 0.58 톤 재현
    bodyBg: `linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.42)), url(${headerLgBg}) center / cover no-repeat`,
    text: '#ffffff',
    forgeBg: 'rgba(255, 255, 255, 0.2)',
    divider: 'rgba(255, 255, 255, 0.4)',
    time: 'rgba(255, 255, 255, 0.8)',
    forgeWhite: false,
    // 차트: 라인=크림슨, 면적/목표선=회색, 월간막대=회색 그라데이션,
    // 품질 최대·스토리지 사용=크림슨 대각 그라데이션, 그외/미사용=#CBC8C2
    line: '#b91c4c',
    areaColor: '#9aa0a8',
    targetColor: '#c5c6c9',
    monFill: 'url(#monGray)',
    qEmphFill: 'url(#qCrimson)',
    qBaseFill: '#cbc8c2',
    segFill: 'linear-gradient(335deg, #cd7b94 11.32%, #bf2d59 44.35%, #b91c4c 77.37%)',
    segEmpty: '#cbc8c2'
  },
  // Solid: 최초 taupe 그라데이션 헤더 + 따뜻한 오프화이트 바디(Figma rgba(226,224,218,0.6))
  solid: {
    headerBg: HEADER_GRAD,
    bodyBg: '#eeece9',
    text: '#ffffff',
    forgeBg: 'rgba(255, 255, 255, 0.2)',
    divider: 'rgba(255, 255, 255, 0.4)',
    time: 'rgba(255, 255, 255, 0.8)',
    forgeWhite: false,
    // 차트: 라인=크림슨(원복), 면적=골드, 목표선=골드,
    // 월간·품질(균일)·스토리지 사용 = 골드 그라데이션(#B5A98F→rgba(197,161,82,0.4)), 미사용=#e6e1d6
    line: '#b91c4c',
    areaColor: '#d5b267',
    targetColor: '#d5b267',
    monFill: 'url(#monGold)',
    qEmphFill: 'url(#qGold)',
    qBaseFill: 'url(#qGold)',
    segFill: 'linear-gradient(180deg, #b5a98f 0%, rgba(197, 161, 82, 0.4) 100%)',
    segEmpty: '#e6e1d6'
  }
}

// ── Styled components ────────────────────────────────────────────

const PageWrap = styled.div`
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
  position: relative;
  font-family: ${FONT_UI};
`

const ScaledContent = styled.div`
  width: ${BASE_W}px;
  height: ${BASE_H}px;
  background: ${({ $bodyBg }) => $bodyBg || BODY_BG};
  transform-origin: top left;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
`

const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 24px;
  height: 60px;
  min-height: 60px;
  background: ${({ $bg }) => $bg || HEADER_GRAD};
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
`

const BrandArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

// LG 브랜드 로고 (LG 텍스트 좌측)
const BrandLogo = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    height: 24px;
    width: auto;
    display: block;
  }
`

const BrandMark = styled.span`
  font-family: ${FONT_HEAD};
  font-size: 20px;
  font-weight: 800;
  color: ${({ $c }) => $c || '#fff'};
  line-height: 1;
  letter-spacing: 0.02em;
`

const BrandTitle = styled.span`
  font-family: ${FONT_HEAD};
  font-size: 20px;
  font-weight: 400;
  color: ${({ $c }) => $c || '#fff'};
  line-height: 1;
`

const TopBarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ForgeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg || 'rgba(255, 255, 255, 0.2)'};
`

const ForgeLogo = styled.span`
  display: inline-flex;
  align-items: center;
  height: 16px;

  svg {
    height: 16px;
    width: auto;
  }
  /* 워드마크(검정 텍스트/글자)만 흰색으로 — 아이콘(마크)은 원래색 유지 */
  svg path[fill='#000'] {
    fill: #fff !important;
  }
  svg text[fill='#000'] {
    fill: #fff !important;
  }
`

const Divider = styled.span`
  width: 1px;
  height: 10px;
  background: ${({ $c }) => $c || 'rgba(255, 255, 255, 0.4)'};
`

const ConnectedTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.78px;
  color: ${({ $c }) => $c || '#fff'};
`

const ConnDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${GREEN};
`

const TimeText = styled.span`
  font-size: 14px;
  color: ${({ $c }) => $c || 'rgba(255, 255, 255, 0.8)'};
  font-variant-numeric: tabular-nums;
`

const RefreshBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ $c }) => $c || 'rgba(255, 255, 255, 0.85)'};
  cursor: pointer;
  transition: transform 0.3s;

  &:hover {
    transform: rotate(90deg);
  }
  svg {
    width: 16px;
    height: 16px;
  }
`

// 컬러 모드 토글 (Solid / LG)
const ModeToggle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg || 'rgba(255, 255, 255, 0.2)'};
`

const ModeBtn = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  font-family: ${FONT_UI};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  background: ${({ $active, $activeBg }) => ($active ? $activeBg : 'transparent')};
  color: ${({ $active, $activeColor, $idleColor }) => ($active ? $activeColor : $idleColor)};
`

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 20px;
  overflow: hidden;
`

const CollectionWrap = styled.div`
  flex: 0 0 auto;
  min-height: 0;
`

// Figma: 상태 현황 + 배치 맵이 하나의 프레임(#f1efed 카드)으로 묶임
const BottomCard = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 20px;
  background: ${BODY_BG};
  border-radius: 12px;
  padding: 20px;
  box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.1);
`

// 카드 내부 컬럼(투명): 상태 패널(좌, 432) / 맵 패널(우)
const StatePanel = styled.div`
  flex: 0 0 432px;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const MapPanel = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* 상태 패널(텍스트만)과 맵 패널(영역 칩) 헤더 높이를 통일해 하단 콘텐츠 상단 정렬 */
  min-height: 28px;
  flex-shrink: 0;
  margin-bottom: 12px;
`

const SectionTitle = styled.h3`
  font-family: ${FONT_UI};
  font-size: 16px;
  font-weight: 700;
  color: ${TITLE_COLOR};
  margin: 0;
`

const TotalRobots = styled.span`
  margin-left: auto;
  font-family: ${FONT_UI};
  font-size: 14px;
  font-weight: 600;
  color: #64748b;

  strong {
    color: #4f46e5;
    font-weight: 800;
    margin: 0 2px;
  }
`

// ── 지도 상단 영역 바 (빌딩명 + 동일 빌딩 3개 영역, 현재 영역 빨강) ──
const AreaBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
`

const BuildingName = styled.span`
  font-family: ${FONT_UI};
  font-size: 14px;
  font-weight: 700;
  color: #454749;
  white-space: nowrap;
  padding-right: 12px;
  border-right: 1px solid #e1e2e5;
`

const AreaChips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const AreaChip = styled.span`
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid ${({ $active }) => ($active ? CRIMSON : '#e1e2e5')};
  background: ${({ $active }) => ($active ? CRIMSON : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#757779')};
`

const MapWrap = styled.div`
  flex: 1;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #ffffff;

  > * {
    position: absolute !important;
    inset: 0 !important;
    height: auto !important;
    width: auto !important;
  }
`

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 3v6h-6" />
  </svg>
)

const REFRESH_INTERVAL = 1 * 1000 // 로봇 상태·위치 1초마다 갱신 (맵 자체는 영역/사이트 변경 시에만 로드)
const AREA_CYCLE_INTERVAL = 60 * 1000 // 1분마다 영역 전환
const AREAS_PER_PAGE = 3

// ── 영역 순서/페이지 계산 ────────────────────────────────────────
// 층 순서: floorIndex 1 이상 오름차순 → 0 이하 내림차순
const orderFloors = (floors = []) => {
  const arr = [...floors]
  const above = arr.filter((f) => (f.floorIndex ?? 0) >= 1).sort((a, b) => (a.floorIndex ?? 0) - (b.floorIndex ?? 0))
  const below = arr.filter((f) => (f.floorIndex ?? 0) <= 0).sort((a, b) => (b.floorIndex ?? 0) - (a.floorIndex ?? 0))
  return [...above, ...below]
}

// buildings(목록순) → 층(위 순서) → 영역(목록순) 으로 펼치고,
// 빌딩 경계를 넘지 않는 3개 단위 페이지로 묶는다.
const buildAreaPlan = (buildings = []) => {
  const pages = []
  const seq = []
  buildings.forEach((b) => {
    const areas = []
    orderFloors(b.floors || []).forEach((f) => {
      ;(f.areas || []).forEach((a) => {
        areas.push({
          buildingId: b.buildingId,
          buildingName: b.buildingName,
          floorId: f.floorId,
          floorName: f.floorName,
          floorIndex: f.floorIndex,
          areaId: a.areaId,
          areaName: a.areaName
        })
      })
    })
    for (let i = 0; i < areas.length; i += AREAS_PER_PAGE) {
      const chunk = areas.slice(i, i + AREAS_PER_PAGE)
      const pageIndex = pages.length
      pages.push({ buildingId: b.buildingId, buildingName: b.buildingName, areas: chunk })
      chunk.forEach((a) => seq.push({ ...a, pageIndex }))
    }
  })
  return { pages, seq }
}

// 층명 + 영역명 (영역명에 '-' 포함 시 영역명 생략)
const areaLabel = (a) => {
  if (!a) return ''
  const floor = a.floorName || ''
  const area = a.areaName || ''
  const showArea = area && !area.includes('-')
  return (showArea ? `${floor} ${area}` : floor || area).trim()
}

// ── Component ────────────────────────────────────────────────────

const TVDashboard = () => {
  const { t } = useTranslation('robot')
  const [searchParams] = useSearchParams()

  const paramGroup = searchParams.get('group') ?? 'all'
  const paramSite  = searchParams.get('site')  ?? 'all'
  const hasSite = paramSite !== 'all' && paramSite !== 'none'

  const [scale, setScale] = useState(1)
  const [devices, setDevices] = useState([])
  const [sites, setSites] = useState([])
  const [buildings, setBuildings] = useState([])
  const [markers, setMarkers] = useState([])
  const [deviceCount, setDeviceCount] = useState({ opr: 0, lrn: 0, sta: 0, chr: 0, err: 0, off: 0 })
  const [mapData, setMapData] = useState({})
  const [mapServer, setMapServer] = useState({})
  const [now, setNow] = useState(new Date())
  const [currentAreaIdx, setCurrentAreaIdx] = useState(0)
  const [colorMode, setColorMode] = useState('gradient') // 'gradient' | 'solid'
  const theme = COLOR_MODES[colorMode]
  const intervalRef = useRef(null)

  // 영역 순서/페이지
  const { pages, seq } = useMemo(() => buildAreaPlan(buildings), [buildings])
  const areaMode = hasSite && seq.length > 0
  const currentArea = areaMode ? seq[currentAreaIdx % seq.length] : null
  const currentPage = currentArea ? pages[currentArea.pageIndex] : null

  // 뷰포트에 맞춰 전체 스케일 계산 (1920×1080 캔버스를 축소)
  useEffect(() => {
    const calc = () => {
      setScale(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // 지도 로드 (영역 선택 시 빌딩/층/영역 ID 함께 전송, 없으면 사이트 지도)
  const loadMap = useCallback(async (groupId, siteId, area) => {
    try {
      const params = { groupId, siteId }
      if (area?.buildingId) params.buildingId = area.buildingId
      if (area?.floorId) params.floorId = area.floorId
      if (area?.areaId) params.areaId = area.areaId
      const data = await mapApis.getMapViewFind(params)
      let type = 'png', url = ''
      if (data.mapServer?.navi?.svgDownloadUrl) {
        type = 'svg'; url = data.mapServer.navi.svgDownloadUrl
      } else {
        url = data.mapServer?.navi?.pngDownloadUrl
      }
      if (!url) { setMapData({}); setMapServer({}); return }
      setMapData({ type, url })
      setMapServer(data.mapServer)
    } catch (err) {
      console.error('TVDashboard loadMap:', err)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const siteId = hasSite ? paramSite : undefined
      const [robotRes, siteRes] = await Promise.all([
        deviceApis.getDevices(siteId ? { siteId } : {}),
        siteApis.getSites({})
      ])
      setDevices(robotRes.content)
      setSites(siteRes.content)
    } catch (err) {
      console.error('TVDashboard loadData:', err)
    }
  }, [hasSite, paramSite])

  useEffect(() => {
    loadData()
  }, [])

  // 사이트 계층(빌딩/층/영역) 조회
  useEffect(() => {
    if (!hasSite) { setBuildings([]); return }
    siteApis
      .getSiteById(paramSite)
      .then((d) => setBuildings(d?.buildings ?? []))
      .catch((err) => { console.error('TVDashboard getSiteById:', err); setBuildings([]) })
  }, [hasSite, paramSite])

  // 영역 시퀀스가 바뀌면 인덱스 초기화
  useEffect(() => { setCurrentAreaIdx(0) }, [seq.length])

  // 1분마다 영역 순환 (마지막 → 처음)
  useEffect(() => {
    if (!areaMode) return
    const id = setInterval(() => setCurrentAreaIdx((i) => (i + 1) % seq.length), AREA_CYCLE_INTERVAL)
    return () => clearInterval(id)
  }, [areaMode, seq.length])

  // 현재 영역/사이트 지도 로드
  useEffect(() => {
    if (!hasSite) return
    if (areaMode && currentArea) loadMap(paramGroup, paramSite, currentArea)
    else loadMap(paramGroup, paramSite)
  }, [hasSite, areaMode, currentArea?.areaId, paramGroup, paramSite, loadMap])

  // 자동 새로고침 (헤더는 상시 연동 상태 — 항상 라이브)
  useEffect(() => {
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [loadData])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 상태별 전체(사이트 단위) 로봇 수 집계 + 권역 마커
  useEffect(() => {
    const count = { opr: 0, lrn: 0, sta: 0, chr: 0, err: 0, off: 0 }
    const siteMap = new Map()

    devices.forEach((d) => {
      switch (d.deviceState) {
        case 'OPERATION': count.opr++; break
        case 'LEARNING':  count.lrn++; break
        case 'STANDBY':   count.sta++; break
        case 'CHARGE':    count.chr++; break
        case 'ERROR':     count.err++; break
        case 'OFFLINE':   count.off++; break
      }

      if (!hasSite) {
        const siteId = d.provision?.isDefaultSite !== true && d.provision?.siteName
          ? d.provision.siteId : null
        if (!siteId) return
        const site = sites.find((s) => s.siteId === siteId)
        if (!site?.siteLatitude || !site?.siteLongitude) return
        if (!siteMap.has(siteId)) {
          siteMap.set(siteId, { name: site.siteName, lat: site.siteLatitude, lng: site.siteLongitude, count: 0 })
        }
        siteMap.get(siteId).count++
      }
    })

    setDeviceCount(count)
    if (!hasSite) {
      setMarkers(Array.from(siteMap.values()).map((m) => ({
        title: `${m.name} - ${m.count}${t('unit')}`,
        lat: m.lat,
        lng: m.lng
      })))
    }
  }, [devices, sites, hasSite, t])

  // 현재 영역에 위치한 로봇 (sitePosition.areaId 기준)
  const areaRobotDatas = useMemo(() => {
    if (!areaMode || !currentArea) return []
    return devices
      .filter((d) => d.state?.sitePosition?.areaId === currentArea.areaId)
      .map(parseRobotData)
  }, [devices, areaMode, currentArea?.areaId])

  // 사이트 지도 모드(영역 정보 없음)일 때는 전체 로봇 표시
  const siteRobotDatas = useMemo(
    () => (hasSite && !areaMode ? devices.map(parseRobotData) : []),
    [devices, hasSite, areaMode]
  )

  const timeLabel =
    `${t('collection.today')} ${t('collection.updated')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} UTC+9`

  const mapTitle = t('robotPlacementStatus', '로봇 배치 현황 및 위치 정보')
  const totalRobots =
    deviceCount.opr + deviceCount.lrn + deviceCount.sta + deviceCount.chr + deviceCount.err + deviceCount.off

  return (
    <PageWrap>
      <ScaledContent $bodyBg={theme.bodyBg} style={{ transform: `scale(${scale})` }}>
        {/* ── Header (Figma: LG Robot Ops / Forge Connected / time) ── */}
        <TopBar $bg={theme.headerBg}>
          <BrandArea>
            <BrandLogo dangerouslySetInnerHTML={{ __html: lgBrandSvg }} />
            <BrandMark $c={theme.text}>LG</BrandMark>
            <BrandTitle $c={theme.text}>Robot Ops</BrandTitle>
          </BrandArea>
          <TopBarRight>
            {/* 컬러 모드 스위치 */}
            <ModeToggle $bg={theme.forgeBg}>
              <ModeBtn
                $active={colorMode === 'solid'}
                $activeBg="#ffffff"
                $activeColor="#181818"
                $idleColor={theme.text}
                onClick={() => setColorMode('solid')}
              >
                Solid
              </ModeBtn>
              <ModeBtn
                $active={colorMode === 'gradient'}
                $activeBg="#a50034"
                $activeColor="#ffffff"
                $idleColor={theme.text}
                onClick={() => setColorMode('gradient')}
              >
                Gradient
              </ModeBtn>
            </ModeToggle>
            <ForgeBadge $bg={theme.forgeBg}>
              <ForgeLogo dangerouslySetInnerHTML={{ __html: forgeLogoSvg }} />
              <Divider $c={theme.divider} />
              <ConnectedTag $c={theme.text}>
                <ConnDot />
                {t('connected')}
              </ConnectedTag>
            </ForgeBadge>
            <TimeText $c={theme.time}>{timeLabel}</TimeText>
            <RefreshBtn $c={theme.text} onClick={loadData} title={t('collection.refresh')}>
              <RefreshIcon />
            </RefreshBtn>
          </TopBarRight>
        </TopBar>

        <Body>
          {/* ── KPI 카드 열 (라이브 데이터, 헤더/Forge바 숨김) ── */}
          <CollectionWrap>
            <DataCollectionSection
              chartHeight={90}
              showSectionTitle={false}
              showForgeBar={false}
              line={theme.line}
              areaColor={theme.areaColor}
              targetColor={theme.targetColor}
              monFill={theme.monFill}
              qEmphFill={theme.qEmphFill}
              qBaseFill={theme.qBaseFill}
              segFill={theme.segFill}
              segEmpty={theme.segEmpty}
            />
          </CollectionWrap>

          {/* ── 하단: 상태 현황 + 배치 맵 (Figma: 하나의 프레임) ── */}
          <BottomCard>
            <StatePanel>
              <SectionHead>
                <SectionTitle>{t('robotStateStatus', '로봇 상태 현황')}</SectionTitle>
                <TotalRobots>
                  {t('totalRobots', '총 로봇')} <strong>{totalRobots}</strong>{t('unit')}
                </TotalRobots>
              </SectionHead>
              {/* 상태별 아이콘/상태/총 로봇수 + 현재 3개 영역별 로봇 수(각 상태) */}
              <RobotStateCards
                deviceCount={deviceCount}
                compact
                areaColumns={
                  areaMode && currentPage
                    ? currentPage.areas.map((a) => ({ areaId: a.areaId, label: areaLabel(a) }))
                    : null
                }
                devices={devices}
              />
            </StatePanel>

            <MapPanel>
              {/* 제목 + 영역 바를 한 줄에 두어 상태 카드 상단과 정렬 */}
              <SectionHead>
                <SectionTitle>{mapTitle}</SectionTitle>
                {areaMode && currentPage && (
                  <AreaBar>
                    <BuildingName>{currentPage.buildingName}</BuildingName>
                    <AreaChips>
                      {currentPage.areas.map((a) => (
                        <AreaChip key={a.areaId} $active={a.areaId === currentArea.areaId}>
                          {areaLabel(a)}
                        </AreaChip>
                      ))}
                    </AreaChips>
                  </AreaBar>
                )}
              </SectionHead>

              <MapWrap>
                {hasSite ? (
                  <SiteMap3D
                    mapData={mapData}
                    mapServer={mapServer}
                    robotDatas={areaMode ? areaRobotDatas : siteRobotDatas}
                    clickRobot={false}
                    height="100%"
                  />
                ) : (
                  <Location markers={markers} />
                )}
              </MapWrap>
            </MapPanel>
          </BottomCard>
        </Body>
      </ScaledContent>
    </PageWrap>
  )
}

export default TVDashboard
