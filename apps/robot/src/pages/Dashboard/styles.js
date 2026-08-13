import styled, { keyframes } from 'styled-components'

export const DashboardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
  display: flex;
`

export const DashboardControlsContainer = styled.div`
  display: flex;
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 3.2rem;

  > * {
    margin: 0;
  }

  @media all and (max-width: 1199px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1.2rem;
    margin-bottom: 2.4rem;

    > * {
      width: 100%;
      margin: 0;
    }

    button {
      flex: 0 0 auto;
    }
  }
`

export const DashboardButtonGroup = styled.div`
  display: flex;
  gap: 1.2rem;
  align-items: center;
`

export const DashSection = styled.section``

export const DivPageBody = styled.div`
  gap: 2.4rem;
  flex-wrap: wrap;
  display: flex;
  margin-top: 10px;
`

export const DivDashState = styled.div`
  width: calc(100% / 3 * 2 - 3.2rem);
  flex-direction: column;
  flex: 1 1 0%;
  display: flex;
`

export const DivSectionTitle = styled.div`
  /* justify-content: space-between; */
  align-items: center;
  display: flex;
`

export const DivSectionTitleWrap = styled.div`
  display: flex;
  align-items: center;

  @media all and (max-width: 767px) {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem;
  }
`

export const H3SectionTitle = styled.h3`
  --tw-text-opacity: 1;
  color: rgb(44 45 56 / var(--tw-text-opacity));
  font-weight: 700;
  font-size: 1.6rem;
  margin-bottom: 1.3rem;
`

export const DivStateList = styled.div`
  cursor: pointer;
  gap: 0.8rem;
  display: flex;
  flex-wrap: wrap;
`

export const ArticleStateItem = styled.article`
  min-height: calc(100% - 36px);
  background: linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%);
  padding: 1.6rem 2rem;
  color: #333;
  justify-content: space-between;
  flex-direction: column;
  height: 10.6rem;
  flex: 1 1 0%;
  display: flex;
  border-radius: 1rem;
  border: solid 1px rgba(172, 173, 188, 0.3);
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.2);
  position: relative;
`

export const H4StateText = styled.h4`
  padding-left: 7rem;
  font-size: 1.6rem;
  text-align: right;
  word-break: keep-all;
  word-wrap: break-word;
  font-weight: 700;
`

export const DivStateCount = styled.div`
  justify-content: space-between;
  align-items: flex-end;
  display: flex;
`

export const StrongStateNumber = styled.strong`
  font-size: 2.7rem;
  margin-left: auto;
  line-height: 1.16;
`

export const SpanStateUnit = styled.span`
  font-size: 1.2rem;
`

export const DivMarginTop = styled.div`
  margin-top: 3.2rem;
`

export const ArticleMap = styled.article`
  min-height: calc(100% - 36px);
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  justify-content: flex-end;
  flex: none;
  width: 100%;
  hegit: 431px;
`

export const DivMapCard = styled.div`
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
`

export const DivMapWrap = styled.div`
  overflow: hidden;
  width: 100%;
}
`

export const DivDashAlarmTable = styled.div`
  > * {
    flex-basis: auto;
  }
`

export const InspectionWrapper = styled.div`
  margin-top: 2.4rem;
`

export const CollapsibleSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  margin-bottom: ${({ $collapsed }) => ($collapsed ? '0' : '1.3rem')};
`

export const CollapsibleChevron = styled.span`
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #334155;
  transition: transform 0.2s ease;
  transform: ${({ $collapsed }) => ($collapsed ? 'rotate(-90deg)' : 'rotate(0deg)')};
`

export const CollapseToggleBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 10px;
  border-radius: 6px;
  color: #64748b;
  font-size: 1.2rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
  }
`

export const CollapsibleBody = styled.div`
  overflow: hidden;
  max-height: ${({ $collapsed }) => ($collapsed ? '0' : 'none')};
  transition: max-height 0.3s ease-in-out;
`

export const SectionMap = styled.section`
  padding: 2rem;
  background: var(--color-neutral-10);
  border: 1px solid var(--color-secondary-20);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-00);
`

export const PlayButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  padding: 3px 8px;
  height: 2.4rem;
  border-radius: 4px;

  font-size: 11px;

  border: 1px solid var(--t-play-btn-border);
  background-color: var(--t-play-btn-bg);
  color: var(--t-play-btn-text);

  cursor: pointer;

  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--t-play-btn-hover-bg);
  }
`

export const StopButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  padding: 3px 8px;
  height: 2.4rem;
  border-radius: 4px;

  font-size: 11px;

  border: 1px solid #fca5a5;
  background-color: #fef2f2;
  color: #dc2626;

  cursor: pointer;

  transition: background-color 0.2s ease;

  &:hover {
    background-color: #fee2e2;
  }
`

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

export const LiveSpan = styled.span`
  margin-left: 10px;
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  font-size: 10px;
  color: #10b981;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #10b981;

    display: inline-block;

    animation: ${pulse} 1s infinite;
  }
`
