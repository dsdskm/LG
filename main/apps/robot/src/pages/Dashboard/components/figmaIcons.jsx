import styled from 'styled-components'

// ── Figma 원본 아이콘 (Dev Mode MCP 추출 → 항목별 단일 SVG로 통합) ──
// 전부 인라인 SVG로 렌더(<img> 는 100% 사이즈 SVG 로딩 실패 → 깨짐).
//  · 카드 제목 아이콘: 어두운 칩(#454749) + 흰색 글리프 (Figma 그대로)
//  · 상태 아이콘: Figma 색상 유지, 부모 원형 배지 안에서 렌더
import cumulativeRaw from '@/assets/icons/figma/card_cumulative.svg?raw'
import targetRaw from '@/assets/icons/figma/card_target.svg?raw'
import inboxRaw from '@/assets/icons/figma/card_inbox.svg?raw'

import operationRaw from '@/assets/icons/figma/state_operation.svg?raw'
import learningRaw from '@/assets/icons/figma/state_learning.svg?raw'
import standbyRaw from '@/assets/icons/figma/state_standby.svg?raw'
import chargeRaw from '@/assets/icons/figma/state_charge.svg?raw'
import networkRaw from '@/assets/icons/figma/state_network.svg?raw'
import errorRaw from '@/assets/icons/figma/state_error.svg?raw'

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

// ── 상태 아이콘: 원형 배지 안에서 렌더 (색상은 Figma 그대로) ──────
// 아이콘마다 Figma 박스 크기가 달라(네트워크 50 / 에러 32 등) w·h 를 개별 지정 →
// 시각적 글리프 크기가 서로 맞고, 박스 비율대로 렌더해 왜곡도 없음.
const StateGlyph = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $w }) => $w || 36}px;
  height: ${({ $h }) => $h || 36}px;

  svg {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
`

export const OperationIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: operationRaw }} />
export const LearningIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: learningRaw }} />
export const StandbyIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: standbyRaw }} />
export const ChargeIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: chargeRaw }} />
export const NetworkIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: networkRaw }} />
export const ErrorIcon = ({ w, h }) => <StateGlyph $w={w} $h={h} dangerouslySetInnerHTML={{ __html: errorRaw }} />
