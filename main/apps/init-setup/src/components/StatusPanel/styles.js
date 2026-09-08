import styled from 'styled-components'

// jsx 에서 옮겨온 스타일이다 — 값(px·hex)은 그대로 뒀다. 이 패널은 개발용 토픽 뷰라
// 공용 토큰으로 맞추는 일은 별도 작업으로 둔다(옮기는 김에 색을 바꾸면 회귀를 구분할 수 없다).

// 카드 3개를 세로로 쌓는 우측 열. 배경/보더는 각 Section 이 갖는다.
// Section 은 className/style prop 을 받지 않아서 높이 배분은 래퍼(GrowBlock/FixedBlock)로 준다.
export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 320px;
  height: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
`

// 남는 높이를 나눠 갖고 내부에서 스크롤하는 카드(토픽 정보 / 토픽 목록)
export const GrowBlock = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`

// 내용 높이로 고정되는 카드(범례)
export const FixedBlock = styled.div`
  display: flex;
  flex-shrink: 0;
`

export const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

// ── 토픽 정보 블록 ───────────────────────────────────────────────────────────

// 카드 내부에서 토픽별 상세를 구분하는 작은 블록 — 공용 Section 과는 다르다.
export const InfoBlockWrap = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
`

export const InfoBlockTitle = styled.div`
  margin-bottom: 6px;
  color: #2980b9;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`

export const RowWrap = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 3px;
`

export const RowLabel = styled.span`
  color: #666;
  font-size: 12px;
  flex-shrink: 0;
`

// 값 색은 강조 종류($highlight)로 정한다 — 호출부가 색을 직접 넘기지 않게 한다.
const ROW_VALUE_COLOR = {
  green: '#27ae60',
  red: '#e74c3c',
  gray: '#888'
}

export const RowValue = styled.span`
  color: ${({ $highlight }) => ROW_VALUE_COLOR[$highlight] ?? '#222'};
  font-family: ${({ $mono }) => ($mono ? 'monospace' : 'inherit')};
  font-size: 12px;
  text-align: right;
  word-break: break-all;
`

export const EmptyText = styled.div`
  padding: 4px 0;
  color: #aaa;
  font-size: 12px;
`

// ── /tf · /tf_static 목록 ────────────────────────────────────────────────────

export const TransformList = styled.div`
  max-height: 150px;
  overflow-y: auto;
`

export const TransformItem = styled.div`
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f2f2f2;
`

export const TransformFrame = styled.div`
  color: #555;
  font-family: monospace;
  font-size: 10px;
  font-weight: bold;
`

// ── JSON 토픽 데이터 ─────────────────────────────────────────────────────────

export const JsonWrap = styled.div`
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #4a5568;
  border-radius: 4px;
  background: #2d3748;
  color: #a0aec0;

  & > pre {
    margin: 0;
    font-family: monospace;
    font-size: 10px;
    white-space: pre-wrap;
    word-break: break-all;
  }
`

// ── 토픽 목록 ────────────────────────────────────────────────────────────────

export const CategoryHeader = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
`

export const CategoryTitle = styled.span`
  color: #7f8c8d;
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`

/** $spaced: 뒤에 다른 카테고리가 이어지는 목록만 아래 여백을 갖는다(기하 정보 → 텍스트 정보). */
export const TopicContainer = styled.div`
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 6px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fafafa;
  margin-bottom: ${({ $spaced }) => ($spaced ? '12px' : '0')};
`

export const TopicRow = styled.div`
  display: flex;
  align-items: center;
  padding: 3px 0;
  border-bottom: 1px solid #f2f2f2;
`

export const TopicLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;
  user-select: none;
`

export const TopicName = styled.span`
  flex: 1;
  color: #333;
  font-family: monospace;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ── 범례 ─────────────────────────────────────────────────────────────────────

export const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`

// 지도 칸 색을 그대로 보여주는 견본이라 색($color)은 호출부에서 받는다.
export const LegendSwatch = styled.div`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  border: ${({ $bordered }) => ($bordered ? '1px solid #ccc' : 'none')};
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.15),
    inset 0 0 0 1px rgba(0, 0, 0, 0.1);
`

export const LegendLabel = styled.span`
  font-size: 12px;
`
