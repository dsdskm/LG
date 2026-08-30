import styled, { css } from 'styled-components'

export const EventPageLayout = styled.div`
  display: grid;
  grid-template-columns: ${({ $detailOpen }) => ($detailOpen ? 'minmax(0, 6fr) minmax(0, 4fr)' : 'minmax(0, 1fr) 0fr')};
  align-items: start;
  gap: ${({ $detailOpen }) => ($detailOpen ? '16px' : '0px')};
  width: 100%;
  min-width: 0;
`

export const EventTableArea = styled.div`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-self: start;
`

export const EventDetailArea = styled.div`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  justify-content: flex-end;
  align-self: start;
  position: relative;

  ${({ $open }) =>
    !$open &&
    css`
      max-height: 0;
      pointer-events: none;
    `}
`

export const EventDetailSlideInner = styled.div`
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex: 1 1 auto;
  overflow: hidden;
  will-change: auto;
  transform-origin: right center;
  backface-visibility: hidden;

  ${({ $open }) =>
    $open
      ? css`
          opacity: 1;
          transform: none;
          transition: opacity 1000ms ease;
        `
      : css`
          opacity: 0;
          transform: none;
          transition: opacity 1000ms ease;
          pointer-events: none;
        `}
`
