import styled from 'styled-components'

export const PreviewCard = styled.div<{ $hidden?: boolean }>`
  /* 상태 문구(PreviewStatusOverlay)의 기준점 */
  position: relative;
  display: ${({ $hidden }) => ($hidden ? 'none' : 'flex')};
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  background: #f7f7f8;
`

/**
 * 콘텐츠 없음/오류/로딩 문구를 카드 위에 덮는 레이어.
 *
 * 3D 캔버스를 조건부로 렌더하지 않고 덮기만 하는 이유: <Canvas> 를 마운트/언마운트하면
 * WebGL 컨텍스트를 매번 새로 만들게 되고(브라우저당 개수 제한도 있다) URDF 씬을 다시 세워야 한다.
 */
export const PreviewStatusOverlay = styled.div<{ $tone?: 'error' | 'muted' }>`
  position: absolute;
  inset: 10px; /* PreviewCard 의 padding 과 맞춤 */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(247, 247, 248, 0.94);
  color: ${({ $tone }) => ($tone === 'error' ? '#dc2626' : '#6b7280')};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  padding: 0 12px;
  white-space: pre-line;
`

export const PreviewHeaderTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
`

export const MediaStage = styled.div`
  min-height: 156px;
  border-radius: 12px;
  background: #ececef;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`
/**
 * MediaStage 안에 표시하는 상태 문구(콘텐츠 없음 / 오류 / 로딩).
 * 3D 프리뷰는 캔버스를 덮어야 해서 PreviewStatusOverlay 를 쓰고, 사운드·얼굴 프리뷰는
 * 이미 MediaStage 가 자리를 잡고 있으므로 그 안에 문구만 바꿔 넣는다.
 */
export const MediaStatusText = styled.div<{ $tone?: 'error' | 'muted' }>`
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
  color: ${({ $tone }) => ($tone === 'error' ? '#dc2626' : '#6b7280')};
`

export const MediaFallbackText = styled.div`
  font-size: 20px;
  font-weight: 500;
  color: #111111;
  line-height: 1;
`

export const AudioControlGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`

export const AudioControlButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #f3f4f6;
  }
  &:disabled {
    background: #f9fafb;
    color: #9ca3af;
    border-color: #e5e7eb;
    cursor: not-allowed;
    opacity: 0.6;
  }
`
