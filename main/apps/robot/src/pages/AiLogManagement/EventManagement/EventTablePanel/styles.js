import styled, { css } from 'styled-components'

/* ------------------------------
 * layout
 * ------------------------------ */

export const PanelOuter = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`

export const SectionMaxWidth = styled.div`
  width: 100%;
  min-width: 0;
`

export const CountText = styled.div`
  margin: 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`

/* ------------------------------
 * AiLogManagement layout
 * ------------------------------ */

export const PageLayout = styled.div`
  display: grid;
  grid-template-columns: ${({ $detailOpen }) => ($detailOpen ? 'minmax(0, 6fr) minmax(0, 4fr)' : 'minmax(0, 1fr) 0fr')};
  align-items: stretch;
  gap: ${({ $detailOpen }) => ($detailOpen ? '16px' : '0px')};
  width: 100%;
  min-width: 0;
  transition:
    grid-template-columns 320ms cubic-bezier(0.22, 1, 0.36, 1),
    gap 320ms cubic-bezier(0.22, 1, 0.36, 1);
`

export const TableArea = styled.div`
  min-width: 0;
  overflow: hidden;
  display: flex;
`

export const DetailArea = styled.div`
  min-width: 0;
  overflow: hidden;
  display: flex;
  justify-content: flex-end;
  position: relative;
`

export const DetailSlideInner = styled.div`
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex: 1 1 auto;
  will-change: transform, opacity;
  transform-origin: right center;

  ${({ $open }) =>
    $open
      ? css`
          opacity: 1;
          transform: translateX(0);
          transition:
            transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 280ms ease-out;
        `
      : css`
          opacity: 0;
          transform: translateX(150%);
          transition:
            transform 280ms cubic-bezier(0.4, 0, 1, 1),
            opacity 180ms ease-out;
          pointer-events: none;
        `}
`
