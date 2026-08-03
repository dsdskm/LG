import styled from 'styled-components'

// ── Figma 원본 아이콘 (Dev Mode MCP 추출 → 항목별 단일 SVG로 통합) ──
// 전부 인라인 SVG로 렌더(<img> 는 100% 사이즈 SVG 로딩 실패 → 깨짐).
//  · 카드 제목 아이콘: 어두운 칩(#454749) + 흰색 글리프 (Figma 그대로)
//  · 상태 아이콘: Figma 색상 유지, 부모 원형 배지 안에서 렌더
import cumulativeRaw from '@/assets/icons/figma/card_cumulative.svg?raw'
import targetRaw from '@/assets/icons/figma/card_target.svg?raw'
import inboxRaw from '@/assets/icons/figma/card_inbox.svg?raw'

// 상태 아이콘: Figma export SVG(원형 링 배지 + 글리프 포함)를 URL 로 로드해 그대로 <img> 렌더
import operationUrl from '@/assets/icons/figma/state_operation.svg?url'
import learningUrl from '@/assets/icons/figma/state_learning.svg?url'
import standbyUrl from '@/assets/icons/figma/state_standby.svg?url'
import chargeUrl from '@/assets/icons/figma/state_charge.svg?url'
import networkUrl from '@/assets/icons/figma/state_network.svg?url'
import errorUrl from '@/assets/icons/figma/state_error.svg?url'
import cumulativeStateUrl from '@/assets/icons/figma/state_cumulative.svg?url' // 전체(총 로봇 수)

// ── 카드 제목 아이콘: 어두운 칩 + 흰색 아이콘 (Figma: #454749 / rounded 2 / 24px) ──
const CardChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $size }) => $size || 24}px;
  height: ${({ $size }) => $size || 24}px;
  border-radius: 4px;
  background: #454749;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  color: #fff;

  svg {
    width: 66% !important;
    height: 66% !important;
    display: block;
    stroke: currentColor !important;
  }
`
// Figma 카드 글리프는 흰색(var fallback=white) → 칩 위에서 흰색으로 표시
const whiteGlyph = (raw) => ({ __html: raw })

export const CumulativeIcon = ({ size, ...p }) => (
  <CardChip $size={size} dangerouslySetInnerHTML={whiteGlyph(cumulativeRaw)} {...p} />
)
export const TargetIcon = ({ size, ...p }) => (
  <CardChip $size={size} dangerouslySetInnerHTML={whiteGlyph(targetRaw)} {...p} />
)
export const InboxIcon = ({ size, ...p }) => (
  <CardChip $size={size} dangerouslySetInnerHTML={whiteGlyph(inboxRaw)} {...p} />
)

// ── 상태 아이콘: export SVG(64×64, 원형 배지 배경 포함)를 <img> 로 그대로 렌더 ──
// 배지 배경·글리프가 SVG 안에 모두 포함돼 별도 래퍼/틴트 배경이 필요 없음.
const StateImg = styled.img`
  display: block;
  flex-shrink: 0;
  width: ${({ $size }) => $size || 56}px;
  height: ${({ $size }) => $size || 56}px;
`

export const OperationIcon = ({ size, ...p }) => <StateImg src={operationUrl} $size={size} alt="" {...p} />
export const LearningIcon = ({ size, ...p }) => <StateImg src={learningUrl} $size={size} alt="" {...p} />
export const StandbyIcon = ({ size, ...p }) => <StateImg src={standbyUrl} $size={size} alt="" {...p} />
export const ChargeIcon = ({ size, ...p }) => <StateImg src={chargeUrl} $size={size} alt="" {...p} />
export const NetworkIcon = ({ size, ...p }) => <StateImg src={networkUrl} $size={size} alt="" {...p} />
export const ErrorIcon = ({ size, ...p }) => <StateImg src={errorUrl} $size={size} alt="" {...p} />
export const TotalIcon = ({ size, ...p }) => <StateImg src={cumulativeStateUrl} $size={size} alt="" {...p} />
