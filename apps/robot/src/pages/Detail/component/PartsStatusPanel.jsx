import React, { useState, useMemo } from 'react'
import styled from 'styled-components'

// ─── Field specs ──────────────────────────────────────────────────────────────

const MODULE_FIELD_SPECS = {
  'hw-battery': [
    { key: 'chargingStatus', labelKo: '충전 상태', labelEn: 'Charging Status' },
    { key: 'voltage', labelKo: '전압', labelEn: 'Voltage', unit: 'V' },
    { key: 'current', labelKo: '전류', labelEn: 'Current', unit: 'A' },
    {
      key: 'temperature',
      labelKo: '온도',
      labelEn: 'Temperature',
      unit: '℃',
      warningCheck: (v) => typeof v === 'number' && v >= 60
    },
    {
      key: 'soc',
      labelKo: 'SOC (잔여용량)',
      labelEn: 'SOC',
      unit: '%',
      warningCheck: (v) => typeof v === 'number' && v <= 20
    },
    {
      key: 'soh',
      labelKo: 'SOH (배터리 건강)',
      labelEn: 'SOH',
      unit: '%',
      warningCheck: (v) => typeof v === 'number' && v <= 80
    }
  ],
  'hw-wifi': [
    { key: 'activeInterface', labelKo: '활성 인터페이스', labelEn: 'Active Interface' },
    { key: 'mode', labelKo: '동작 모드', labelEn: 'Mode' },
    { key: 'ssid', labelKo: 'SSID', labelEn: 'SSID' },
    { key: 'bssid', labelKo: 'BSSID', labelEn: 'BSSID' },
    { key: 'frequency', labelKo: '주파수', labelEn: 'Frequency', unit: 'MHz' },
    { key: 'channel', labelKo: '채널', labelEn: 'Channel' },
    { key: 'band', labelKo: '주파수 대역', labelEn: 'Band' },
    { key: 'txPower', labelKo: '송신 출력', labelEn: 'TX Power', unit: 'dBm' },
    {
      key: 'rxPower',
      labelKo: '수신 신호 세기',
      labelEn: 'RX Power',
      warningCheck: (v) => {
        if (typeof v !== 'string') return false
        // "(min,avg,max)" 형식
        const m = v.match(/\((-?\d+),(-?\d+),(-?\d+)\)/)
        if (m) return parseInt(m[2]) <= -65
        // 단일 값 "-26 dBm" 형식
        const single = parseFloat(v)
        return !isNaN(single) && single <= -65
      }
    }
  ],
  'hw-usb-hub': [
    { key: 'connectedDevices', labelKo: '연결된 장치 수', labelEn: 'Connected Devices' },
    {
      key: 'expectedDevices',
      labelKo: '기대 장치 수',
      labelEn: 'Expected Devices',
      warningCheck: (_, d) =>
        typeof d.connectedDevices === 'number' &&
        typeof d.expectedDevices === 'number' &&
        d.connectedDevices < d.expectedDevices
    }
  ],
  'hw-emergency-key': [
    { key: 'keyState', labelKo: '비상 정지 상태', labelEn: 'Key State', warningCheck: (v) => v === 'DETECTED' }
  ],
  'hw-main-controller': [
    {
      key: 'cpuTemperature',
      labelKo: 'CPU 온도',
      labelEn: 'CPU Temperature',
      unit: '℃',
      warningCheck: (v) => typeof v === 'number' && v >= 80
    },
    { key: 'memoryTotalMB', labelKo: '전체 메모리', labelEn: 'Total Memory', unit: 'MB' },
    {
      key: 'memoryAvailableMB',
      labelKo: '사용 가능 메모리',
      labelEn: 'Available Memory',
      unit: 'MB',
      warningCheck: (v, d) => typeof v === 'number' && typeof d.memoryTotalMB === 'number' && v / d.memoryTotalMB <= 0.1
    },
    {
      key: 'diskUsagePercent',
      labelKo: '디스크 사용률',
      labelEn: 'Disk Usage',
      unit: '%',
      warningCheck: (v) => typeof v === 'number' && v >= 90
    }
  ],
  'sen-lidar-front': [
    { key: 'dataRate', labelKo: '데이터 발행 주기', labelEn: 'Data Rate' },
    {
      key: 'diagnosticLevel',
      labelKo: '진단 레벨',
      labelEn: 'Diagnostic Level',
      warningCheck: (v) => v === 'WARN' || v === 'STALE' || v === 'ERROR'
    }
  ],
  'sen-imu': [
    { key: 'dataRate', labelKo: '데이터 발행 주기', labelEn: 'Data Rate' },
    {
      key: 'accelerationY',
      labelKo: 'Y축 선형 가속도',
      labelEn: 'Acceleration Y',
      unit: 'm/s²',
      warningCheck: (v) => typeof v === 'number' && (v < 9.0 || v > 10.0)
    }
  ],
  'sen-camera-front': [
    { key: 'dataRate', labelKo: '프레임 레이트', labelEn: 'Frame Rate' },
    {
      key: 'diagnosticLevel',
      labelKo: '진단 레벨',
      labelEn: 'Diagnostic Level',
      warningCheck: (v) => v === 'WARN' || v === 'STALE' || v === 'ERROR'
    }
  ],
  'sen-camera-rear': [
    { key: 'dataRate', labelKo: '프레임 레이트', labelEn: 'Frame Rate' },
    {
      key: 'diagnosticLevel',
      labelKo: '진단 레벨',
      labelEn: 'Diagnostic Level',
      warningCheck: (v) => v === 'WARN' || v === 'STALE' || v === 'ERROR'
    }
  ],
  'sen-tof': [
    { key: 'dataRate', labelKo: '데이터 발행 주기', labelEn: 'Data Rate' },
    { key: 'totalChannels', labelKo: '전체 채널 수', labelEn: 'Total Channels' },
    {
      key: 'activeChannels',
      labelKo: '정상 수신 채널 수',
      labelEn: 'Active Channels',
      warningCheck: (v, d) => typeof v === 'number' && typeof d.totalChannels === 'number' && v < d.totalChannels
    }
  ],
  // SW 모듈 공통 (id가 "sw-"로 시작하는 모든 항목)
  _sw_default: [
    { key: 'name', labelKo: '서비스명', labelEn: 'Service Name' },
    { key: 'version', labelKo: '이미지 버전', labelEn: 'Version' },
    {
      key: 'containerStatus',
      labelKo: '컨테이너 상태',
      labelEn: 'Container Status',
      warningCheck: (v) => v !== 'running'
    },
    { key: 'uptime', labelKo: '가동 시간', labelEn: 'Uptime' },
    { key: 'memoryUsageMB', labelKo: '메모리 사용량', labelEn: 'Memory Usage', unit: 'MB' },
    {
      key: 'restartCount',
      labelKo: '재시작 횟수',
      labelEn: 'Restart Count',
      warningCheck: (v) => typeof v === 'number' && v > 0
    },
    { key: 'imageDigest', labelKo: '이미지 Digest', labelEn: 'Image Digest' }
  ]
}

function getFieldSpecs(moduleId) {
  if (MODULE_FIELD_SPECS[moduleId]) return MODULE_FIELD_SPECS[moduleId]
  if (moduleId.startsWith('sw-')) return MODULE_FIELD_SPECS._sw_default
  return []
}

// ─── robotState 파싱 헬퍼 ───────────────────────────────────────────────────
// hwComponents / sensors / sWmodules 는 JSON 문자열로 내려옴

function safeParseJson(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * robotState → { HW_COMPONENTS, SENSORS, SW_MODULES } 형태로 변환
 * 각 항목은 summary + detail 필드가 합쳐진 평탄한 객체
 */
function parseRobotState(robotState) {
  if (!robotState) return { HW_COMPONENTS: [], SENSORS: [], SW_MODULES: [] }

  const hw = safeParseJson(robotState.hwComponents).map((m) => ({ ...m, category: 'HW_COMPONENTS' }))
  const sen = safeParseJson(robotState.sensors).map((m) => ({ ...m, category: 'SENSORS' }))
  const sw = safeParseJson(robotState.sWmodules).map((m) => ({ ...m, category: 'SW_MODULES' }))

  return { HW_COMPONENTS: hw, SENSORS: sen, SW_MODULES: sw }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const CATEGORY_META = {
  HW_COMPONENTS: { labelKo: 'HW 컴포넌트', labelEn: 'HW Components' },
  SENSORS: { labelKo: '센서', labelEn: 'Sensors' },
  SW_MODULES: { labelKo: 'SW 모듈', labelEn: 'SW Modules' }
}

const STATUS_COLOR = {
  normal: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444'
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '—'
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${MM}.${DD}. ${hh}:${mm}:${ss}`
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const CategoryCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
`

const CategoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
`

const CategoryIconWrap = styled.span`
  display: flex;
  align-items: center;
  color: #7c3aed;
`

const CategoryCount = styled.span`
  font-size: 13px;
  color: #6b7280;
`

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
`

const ModuleRow = styled.div`
  border-bottom: 1px solid #f3f4f6;
  &:last-child {
    border-bottom: none;
  }
`

const ModuleHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: #f9fafb;
  }
`

const StatusDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $status }) => STATUS_COLOR[$status] ?? '#9ca3af'};
`

const ModuleName = styled.span`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ModuleMeta = styled.span`
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
`

const ChevronIcon = styled.span`
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
  margin-left: 4px;
  transform: ${({ $open }) => ($open ? 'rotate(90deg)' : 'rotate(0deg)')};
  transition: transform 0.2s;
`

const DetailPanel = styled.div`
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  padding: 10px 16px 14px 36px;
  animation: slideDown 0.18s ease;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const DetailMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const LastCheck = styled.span`
  font-size: 11px;
  color: #9ca3af;
`

const FieldTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldRow = styled.div`
  display: flex;
  gap: 8px;
  font-size: 13px;
`

const FieldLabel = styled.span`
  color: #6b7280;
  min-width: 140px;
  flex-shrink: 0;
`

const FieldValue = styled.span`
  color: ${({ $warn }) => ($warn ? '#f59e0b' : '#111827')};
  font-weight: ${({ $warn }) => ($warn ? '500' : '400')};
  word-break: break-all;
`

const EmptyText = styled.p`
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const HwIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 12h.01M10 12h.01M14 12h.01" />
  </svg>
)

const SensorIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
  </svg>
)

const SwIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const CATEGORY_ICONS = {
  HW_COMPONENTS: <HwIcon />,
  SENSORS: <SensorIcon />,
  SW_MODULES: <SwIcon />
}

// ─── ModuleDetailPanel ────────────────────────────────────────────────────────
// detail 데이터는 이미 module 객체 안에 포함되어 있으므로 별도 fetch 불필요

const ModuleDetailPanel = ({ module, updatedAt }) => {
  const specs = getFieldSpecs(module.id)

  return (
    <DetailPanel>
      <DetailMeta>
        <LastCheck>
          {updatedAt ? `마지막 업데이트: ${formatDate(updatedAt)}` : `마지막 조회: ${formatDate(module.lastCheck)}`}
        </LastCheck>
      </DetailMeta>

      {specs.length === 0 ? (
        <EmptyText>표시할 항목이 없습니다.</EmptyText>
      ) : (
        <FieldTable>
          {specs.map((spec) => {
            const raw = module[spec.key]
            const isWarn = spec.warningCheck ? spec.warningCheck(raw, module) : false
            const display =
              raw === undefined || raw === null || raw === '' ? '—' : `${raw}${spec.unit ? ` ${spec.unit}` : ''}`
            return (
              <FieldRow key={spec.key}>
                <FieldLabel>{spec.labelKo}</FieldLabel>
                <FieldValue $warn={isWarn}>{display}</FieldValue>
              </FieldRow>
            )
          })}
        </FieldTable>
      )}
    </DetailPanel>
  )
}

// ─── ModuleItem ───────────────────────────────────────────────────────────────

const ModuleItem = ({ module, updatedAt }) => {
  const [open, setOpen] = useState(false)

  return (
    <ModuleRow>
      <ModuleHeader onClick={() => setOpen((v) => !v)}>
        <StatusDot $status={module.status} />
        <ModuleName>{module.name}</ModuleName>
        <ModuleMeta>{formatDate(module.lastCheck)}</ModuleMeta>
        <ChevronIcon $open={open}>›</ChevronIcon>
      </ModuleHeader>

      {open && <ModuleDetailPanel module={module} updatedAt={updatedAt} />}
    </ModuleRow>
  )
}

// ─── CategorySection ──────────────────────────────────────────────────────────

const CategorySection = ({ categoryKey, modules, updatedAt }) => {
  const meta = CATEGORY_META[categoryKey]

  return (
    <CategoryCard>
      <CategoryHeader>
        <CategoryTitle>
          <CategoryIconWrap>{CATEGORY_ICONS[categoryKey]}</CategoryIconWrap>
          {meta.labelKo}
        </CategoryTitle>
        <CategoryCount>{modules.length}개</CategoryCount>
      </CategoryHeader>
      <ModuleList>
        {modules.length === 0 ? (
          <EmptyText>데이터가 없습니다.</EmptyText>
        ) : (
          modules.map((m) => <ModuleItem key={m.id} module={m} updatedAt={updatedAt} />)
        )}
      </ModuleList>
    </CategoryCard>
  )
}

// ─── PartsStatusPanel ─────────────────────────────────────────────────────────

/**
 * Props:
 *   robotState — 로봇 상태 객체 (state 토픽 전체)
 *     ├─ hwComponents        : JSON string | array
 *     ├─ hwComponentsUpdatedAt : ISO8601
 *     ├─ sensors             : JSON string | array
 *     ├─ sensorsUpdatedAt    : ISO8601
 *     ├─ sWmodules           : JSON string | array
 *     └─ sWmodulesUpdatedAt  : ISO8601
 */
const PartsStatusPanel = ({ robotState }) => {
  const grouped = useMemo(() => {
    const parsed = parseRobotState(robotState)
    return Object.keys(CATEGORY_META).map((key) => ({
      key,
      modules: parsed[key] ?? [],
      updatedAt:
        key === 'HW_COMPONENTS'
          ? robotState?.hwComponentsUpdatedAt
          : key === 'SENSORS'
            ? robotState?.sensorsUpdatedAt
            : key === 'SW_MODULES'
              ? robotState?.sWmodulesUpdatedAt
              : null
    }))
  }, [robotState])

  return (
    <Grid>
      {grouped.map(({ key, modules, updatedAt }) => (
        <CategorySection key={key} categoryKey={key} modules={modules} updatedAt={updatedAt} />
      ))}
    </Grid>
  )
}

export default PartsStatusPanel
