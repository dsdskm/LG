import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { MOCK_FLOOR_RATIO } from '@/apis/learning/mockData'
import {
  OperationIcon,
  LearningIcon,
  StandbyIcon,
  ChargeIcon,
  NetworkIcon,
  ErrorIcon
} from './figmaIcons'

// ── Figma 로봇 상태 현황 (상태별 아이콘 + 총계 + 1F/2F/3F 분배) ──
const FLOORS = ['1F', '2F', '3F']

// 총계를 층별로 분배 (mock — 정확한 층별 API 확정 시 교체)
const splitFloors = (total) => {
  const f1 = Math.round(total * MOCK_FLOOR_RATIO['1F'])
  const f2 = Math.round(total * MOCK_FLOOR_RATIO['2F'])
  const f3 = Math.max(0, total - f1 - f2)
  return { '1F': f1, '2F': f2, '3F': f3 }
}

// Figma 순서 + 원본 아이콘 매핑. box = 64px 배지 기준 아이콘 박스 크기(w,h)
// → 배지 크기에 비례해 렌더하면 아이콘별 시각 크기가 Figma대로 일치.
const BADGE_REF = 64
const STATE_DEFS = [
  { key: 'opr', state: 'OPERATION', labelKey: 'operation',            tint: 'rgba(197,192,181,0.4)', Icon: OperationIcon, box: [36, 36] },
  { key: 'lrn', state: 'LEARNING',  labelKey: 'learning',             tint: 'rgba(199,211,245,0.4)', Icon: LearningIcon,   box: [24, 24] },
  { key: 'sta', state: 'STANDBY',   labelKey: 'standby',              tint: 'rgba(226,224,218,0.6)', Icon: StandbyIcon,    box: [20, 28] },
  { key: 'chr', state: 'CHARGE',    labelKey: 'charge',               tint: 'rgba(34,165,108,0.12)', Icon: ChargeIcon,     box: [36, 36] },
  { key: 'off', state: 'OFFLINE',   labelKey: 'networkDisconnection', tint: 'rgba(119,119,114,0.12)', Icon: NetworkIcon,   box: [50, 50] },
  { key: 'err', state: 'ERROR',     labelKey: 'error',                tint: 'rgba(234,25,23,0.1)',   Icon: ErrorIcon,      box: [32, 32] },
]

// 배지 크기에 맞춰 아이콘 글리프 w·h 계산 (Figma 64px 배지 기준 비율)
const glyphSize = (box, badge) => ({ w: (box[0] / BADGE_REF) * badge, h: (box[1] / BADGE_REF) * badge })

const List = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: ${({ $compact }) => ($compact ? '6px' : '8px')};
`

const Row = styled.article`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: ${({ $compact }) => ($compact ? '8px 14px' : '12px 16px')};
  border: 1px solid rgba(197, 192, 181, 0.4);
  border-radius: 12px;
  background: #fff;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.15s;

  &:hover {
    background: ${({ $clickable }) => ($clickable ? '#faf9f7' : '#fff')};
  }
`

// Figma: 원형(rounded 50) 틴트 배경 64px + 아이콘 36px
const IconBadge = styled.div`
  flex: 0 0 auto;
  width: ${({ $compact }) => ($compact ? '44px' : '56px')};
  height: ${({ $compact }) => ($compact ? '44px' : '56px')};
  border-radius: 50%;
  background: ${({ $tint }) => $tint};
  display: flex;
  align-items: center;
  justify-content: center;
`

const Main = styled.div`
  flex: 1 1 auto;
  min-width: ${({ $compact }) => ($compact ? '96px' : '116px')};
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StateLabel = styled.span`
  font-size: ${({ $compact }) => ($compact ? '1.4rem' : '1.8rem')};
  color: #1a1a1a;
  font-weight: 700;
  line-height: 1.2;
  /* 긴 영문 라벨(예: Network Disconnected)이 카드를 넘지 않도록 단어 단위 줄바꿈 */
  white-space: normal;
  word-break: keep-all;
`

const Total = styled.strong`
  font-size: ${({ $compact }) => ($compact ? '2.4rem' : '2.8rem')};
  font-weight: 800;
  color: #111;
  line-height: 1;
`

const TotalUnit = styled.span`
  font-size: ${({ $compact }) => ($compact ? '1.3rem' : '1.5rem')};
  font-weight: 600;
  color: #4e4e4e;
  margin-left: 3px;
`

// Figma: 층별/영역별을 세로로 쌓고(각 행 = 라벨 좌 / 댓수 우), 폭 고정
// 영역 라벨은 층 라벨보다 길어 폭을 넓힘($wide)
const Floors = styled.div`
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '5px' : '7px')};
  width: ${({ $compact, $wide }) =>
    $wide ? ($compact ? '160px' : '190px') : ($compact ? '90px' : '108px')};
`

const FloorCol = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`

const FloorLabel = styled.span`
  font-size: 1.3rem;
  color: #6f6f6f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`

const FloorVal = styled.span`
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  flex-shrink: 0;
`

// ── 대시보드용 가로 배치 (층별 없음, 최소 폭 유지 + 반응형 줄바꿈) ──
const RowWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`

const RowCard = styled.article`
  flex: 1 1 180px;
  min-width: 180px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border: 1px solid rgba(197, 192, 181, 0.4);
  border-radius: 12px;
  background: #fff;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.15s;

  &:hover {
    background: ${({ $clickable }) => ($clickable ? '#faf9f7' : '#fff')};
  }
`

// 아이콘 우측: 상태명 + 댓수 세로 배치
const RowMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const RowLabel = styled.span`
  font-size: 1.4rem;
  color: #1a1a1a;
  font-weight: 700;
  /* 긴 영문 라벨이 카드를 넘지 않도록 단어 단위 줄바꿈 */
  white-space: normal;
  word-break: keep-all;
`

const RowCount = styled.strong`
  font-size: 2.6rem;
  font-weight: 800;
  color: #111;
  line-height: 1;
`

const RobotStateCards = ({ deviceCount = {}, onClickState, compact = false, row = false, areaColumns = null, devices = null }) => {
  const { t } = useTranslation('robot')
  const useAreas = !!(areaColumns && areaColumns.length)

  // 대시보드: 층별 제거, 모든 상태 카드를 한 줄로 가로 배치
  if (row) {
    return (
      <RowWrap>
        {STATE_DEFS.map(({ key, state, labelKey, tint, Icon, box }) => {
          const total = deviceCount[key] ?? 0
          const g = glyphSize(box, 56)
          return (
            <RowCard
              key={key}
              $clickable={!!onClickState}
              data-value={state}
              onClick={onClickState ? () => onClickState(state) : undefined}
            >
              <IconBadge $tint={tint}>
                <Icon w={g.w} h={g.h} />
              </IconBadge>
              <RowMain>
                <RowLabel>{t(labelKey)}</RowLabel>
                <span>
                  <RowCount id={`${key}_cnt`}>{total}</RowCount>
                  <TotalUnit>{t('unit')}</TotalUnit>
                </span>
              </RowMain>
            </RowCard>
          )
        })}
      </RowWrap>
    )
  }

  return (
    <List $compact={compact}>
      {STATE_DEFS.map(({ key, state, labelKey, tint, Icon, box }) => {
        const total = deviceCount[key] ?? 0
        const byFloor = splitFloors(total)
        const g = glyphSize(box, compact ? 44 : 56)
        // 브레이크다운 컬럼: 영역 제공 시 영역별(각 상태의 실제 로봇 수), 없으면 층별(mock)
        const columns = useAreas
          ? areaColumns.map((a) => ({
              key: a.areaId,
              label: a.label,
              value: (devices || []).filter(
                (d) => d.deviceState === state && d.state?.sitePosition?.areaId === a.areaId
              ).length
            }))
          : FLOORS.map((f) => ({ key: f, label: f, value: byFloor[f] }))
        return (
          <Row
            key={key}
            $compact={compact}
            $clickable={!!onClickState}
            data-value={state}
            onClick={onClickState ? () => onClickState(state) : undefined}
          >
            <IconBadge $tint={tint} $compact={compact}>
              <Icon w={g.w} h={g.h} />
            </IconBadge>
            <Main $compact={compact}>
              <StateLabel $compact={compact}>{t(labelKey)}</StateLabel>
              <span>
                <Total $compact={compact} id={`${key}_cnt`}>{total}</Total>
                <TotalUnit $compact={compact}>{t('unit')}</TotalUnit>
              </span>
            </Main>
            <Floors $compact={compact} $wide={useAreas}>
              {columns.map((c) => (
                <FloorCol key={c.key}>
                  <FloorLabel>{c.label}</FloorLabel>
                  <FloorVal>{c.value} {t('unit')}</FloorVal>
                </FloorCol>
              ))}
            </Floors>
          </Row>
        )
      })}
    </List>
  )
}

export default RobotStateCards
