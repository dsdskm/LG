import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import MarqueeText from '@/common/MarqueeText'
import { MOCK_FLOOR_RATIO } from '@/apis/learning/mockData'
import {
  OperationIcon,
  LearningIcon,
  StandbyIcon,
  ChargeIcon,
  NetworkIcon,
  ErrorIcon,
  TotalIcon
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

// Figma 순서 + 원본 아이콘 매핑.
//  · row(대시보드): Icon = 배지 포함 <img>
//  · list(TV): Glyph = 글리프만 + 부모 링 배지(border/tint) — Figma 선택 영역 스타일
const STATE_DEFS = [
  { key: 'opr', state: 'OPERATION', labelKey: 'operation',            Icon: OperationIcon },
  { key: 'lrn', state: 'LEARNING',  labelKey: 'learning',             Icon: LearningIcon },
  { key: 'sta', state: 'STANDBY',   labelKey: 'standby',              Icon: StandbyIcon },
  { key: 'chr', state: 'CHARGE',    labelKey: 'charge',               Icon: ChargeIcon },
  { key: 'off', state: 'OFFLINE',   labelKey: 'networkDisconnection', Icon: NetworkIcon },
  { key: 'err', state: 'ERROR',     labelKey: 'error',                Icon: ErrorIcon },
]

// 전체(총 로봇 수) 카드 — 목록 맨 위. 아이콘 배지 포함 SVG(state_cumulative)
const TOTAL_DEF = { key: 'all', labelKey: 'totalCount', Icon: TotalIcon }

// Figma: 카드가 하나의 흰색 라운드(12px) 패널로 붙고, 카드 사이는 상단 구분선
const List = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
`

const Row = styled.article`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-height: 0;
  padding: 12px 20px;
  background: #fff;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.15s;

  /* 카드끼리 붙는 형태 — 첫 카드 제외 상단 구분선 */
  & + & {
    border-top: 1px solid rgba(153, 145, 129, 0.5);
  }

  &:hover {
    background: ${({ $clickable }) => ($clickable ? '#faf9f7' : '#fff')};
  }
`

const Main = styled.div`
  flex: 0 0 auto;
  display: flex;
  /* 상태 라벨(좌, 94) + 총 Unit 값(우, 80)을 같은 행에 gap 16 으로 배치 */
  flex-direction: ${({ $compact }) => ($compact ? 'row' : 'column')};
  align-items: ${({ $compact }) => ($compact ? 'center' : 'stretch')};
  gap: ${({ $compact }) => ($compact ? '16px' : '2px')};
`

const StateLabel = styled.span`
  width: 94px;
  min-height: 24px;
  font-size: 1.8rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
  line-height: 1.2;
  /* 긴 영문 라벨(예: Network Disconnected)이 카드를 넘지 않도록 단어 단위 줄바꿈 */
  white-space: normal;
  word-break: keep-all;
`

// 총 Unit 값 박스 (Figma 80×33): 숫자 + 단위 하단 정렬, 우측 정렬
const ValueBox = styled.span`
  display: inline-flex;
  align-items: flex-end;
  justify-content: flex-end;
  width: 80px;
  height: 33px;
`

const Total = styled.strong`
  font-size: 2.8rem; /* Figma 28px */
  font-weight: 800;
  color: #111;
  line-height: 1;
`

const TotalUnit = styled.span`
  font-size: ${({ $compact }) => ($compact ? '1.6rem' : '1.5rem')};
  font-weight: 600;
  color: #4e4e4e;
  margin-left: 3px;
`

// Figma: 층별/영역별을 세로로 쌓고(각 행 = 라벨 좌 / 댓수 우), 폭 고정
// compact(TV): 항상 114px 고정 (영역 vs 층 전환 시에도 변하지 않음)
// row(대시보드): $wide에 따라 108px 또는 190px
const Floors = styled.div`
  ${({ $compact }) => (!$compact ? 'margin-left: auto;' : '')}
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '5px' : '7px')};
  /* 층명(72) + gap(16) + 대수(26) = 114px (TV는 고정, 대시보드는 영역모드에서 확장) */
  width: ${({ $compact, $wide }) =>
    $compact ? '114px' : $wide ? '190px' : '108px'};
`

const FloorCol = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  /* $fixed(compact): 층명(72) + gap(16) + 대수(26) */
  gap: ${({ $fixed }) => ($fixed ? '16px' : '8px')};
  width: 100%;
`

const FloorLabel = styled.span`
  font-size: 1.4rem;
  color: #6f6f6f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  text-align: right;
  /* $fixed(층이름): 72px 고정, 긴 영역명은 말줄임 */
  ${({ $fixed }) => $fixed && 'flex: 0 0 72px; width: 72px;'}
`

const FloorVal = styled.span`
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  /* $fixed(해당 층 대수): 26px 고정, 우측 정렬 (앞 gap 16 은 FloorCol 에서) */
  ${({ $fixed }) => $fixed && 'flex: 0 0 26px; width: 26px; text-align: right;'}
`

// ── 대시보드용 가로 배치 (층별 없음, 최소 폭 유지 + 반응형 줄바꿈) ──
const RowWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`

const RowCard = styled.article`
  flex: 1 1 160px;
  min-width: 160px;
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

  /* 모바일에서 2열로 표시 */
  @media (max-width: 768px) {
    flex: 0 1 calc(50% - 6px);
    min-width: 0;
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

const RobotStateCards = ({ deviceCount = {}, onClickState, compact = false, row = false, areaColumns = null, devices = null, total: totalProp }) => {
  const { t } = useTranslation('robot')
  const useAreas = !!(areaColumns && areaColumns.length)
  // 전체 로봇 수 (미지정 시 상태별 합)
  const totalCount = totalProp ?? STATE_DEFS.reduce((s, d) => s + (deviceCount[d.key] ?? 0), 0)

  // 층/영역 브레이크다운 컬럼 계산. stateFilter=null 이면 전체(모든 상태) 집계.
  const columnsFor = (count, stateFilter) => {
    if (useAreas) {
      return areaColumns.map((a) => ({
        key: a.areaId,
        label: a.label,
        value: (devices || []).filter(
          (d) => (stateFilter == null || d.deviceState === stateFilter) && d.state?.sitePosition?.areaId === a.areaId
        ).length
      }))
    }
    const byFloor = splitFloors(count)
    return FLOORS.map((f) => ({ key: f, label: f, value: byFloor[f] }))
  }

  // 대시보드: 층별 제거, 모든 상태 카드를 한 줄로 가로 배치 (학습 카드는 숨김)
  if (row) {
    return (
      <RowWrap>
        {STATE_DEFS.filter((d) => d.state !== 'LEARNING').map(({ key, state, labelKey, Icon }) => {
          const total = deviceCount[key] ?? 0
          return (
            <RowCard
              key={key}
              $clickable={!!onClickState}
              data-value={state}
              onClick={onClickState ? () => onClickState(state) : undefined}
            >
              <Icon size={56} />
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

  // 전체 카드(맨 위) + 상태별 카드. 각 카드는 배지 포함 SVG 아이콘 사용.
  const cards = [
    { key: TOTAL_DEF.key, state: undefined, labelKey: TOTAL_DEF.labelKey, Icon: TOTAL_DEF.Icon, count: totalCount, stateFilter: null },
    ...STATE_DEFS.map((d) => ({ key: d.key, state: d.state, labelKey: d.labelKey, Icon: d.Icon, count: deviceCount[d.key] ?? 0, stateFilter: d.state }))
  ]

  return (
    <List $compact={compact}>
      {cards.map(({ key, state, labelKey, Icon, count, stateFilter }) => {
        const columns = columnsFor(count, stateFilter)
        return (
          <Row
            key={key}
            $compact={compact}
            $clickable={!!onClickState && !!state}
            data-value={state}
            onClick={onClickState && state ? () => onClickState(state) : undefined}
          >
            <Icon size={56} />
            <Main $compact={compact}>
              <StateLabel $compact={compact}>{t(labelKey)}</StateLabel>
              <ValueBox>
                <Total id={`${key}_cnt`}>{count}</Total>
                <TotalUnit $compact={compact}>{t('unit')}</TotalUnit>
              </ValueBox>
            </Main>
            <Floors $compact={compact} $wide={useAreas}>
              {columns.map((c) => {
                // 층이름(70)+유닛수(26)=96px 고정폭: compact(TV) 뷰 전체
                const fixedW = compact
                return (
                  <FloorCol key={c.key} $fixed={fixedW}>
                    <FloorLabel $fixed={fixedW}>
                      <MarqueeText>{c.label}</MarqueeText>
                    </FloorLabel>
                    <FloorVal $fixed={fixedW}>{c.value}</FloorVal>
                  </FloorCol>
                )
              })}
            </Floors>
          </Row>
        )
      })}
    </List>
  )
}

export default RobotStateCards
