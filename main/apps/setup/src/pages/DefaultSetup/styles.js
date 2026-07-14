import styled, { css } from 'styled-components'

export const StyledPageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 2.4rem;
  width: 100%;
  height: auto;
  min-height: 100%;
  overflow: visible;
`

export const PageHero = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  padding-bottom: 2.2rem;
  border-bottom: 1px solid #e6ebf2;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

export const HeroText = styled.div``

export const HeroEyebrow = styled.div`
  color: #38a3c7;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export const HeroTitle = styled.h2`
  margin: 0.4rem 0 0;
  color: #1f2937;
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.03em;
`

export const HeroDescription = styled.p`
  margin: 0.8rem 0 0;
  color: #667085;
  font-size: 1.4rem;
  line-height: 1.65;
`

export const BadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.8rem;
`

const badgeTone = {
  blue: css`
    color: #1681a7;
    background: #eaf6fb;
    border-color: #bce5f3;
  `,
  green: css`
    color: #178a4b;
    background: #e8f7ef;
    border-color: #bfe8d0;
  `,
  orange: css`
    color: #b76a00;
    background: #fff4e5;
    border-color: #ffd79a;
  `,
  red: css`
    color: #c43d3d;
    background: #fdecec;
    border-color: #f4b9b9;
  `,
  gray: css`
    color: #667085;
    background: #f3f5f8;
    border-color: #d9dee7;
  `
}

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border: 1px solid;
  border-radius: 999px;
  padding: 0.55rem 1.05rem;
  font-size: 1.2rem;
  font-weight: 800;
  ${({ tone = 'gray' }) => badgeTone[tone] || badgeTone.gray}
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.4rem;
  margin-top: 2.2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

export const SummaryCard = styled.div`
  border: 1px solid #e3e8ef;
  border-radius: 1.8rem;
  background: #f8fafc;
  padding: 1.7rem 1.8rem;
`

export const SummaryLabel = styled.div`
  color: #667085;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export const SummaryValue = styled.div`
  margin-top: 0.8rem;
  color: ${({ accent }) => (accent ? '#1681a7' : '#1f2937')};
  font-size: 1.55rem;
  font-weight: 900;
  word-break: break-all;
`

export const SummaryHint = styled.div`
  margin-top: 0.5rem;
  color: #8a94a6;
  font-size: 1.22rem;
  line-height: 1.55;
`

export const SectionCard = styled.div`
  margin-top: 2.4rem;
  border: 1px solid #e1e6ef;
  border-radius: 2rem;
  background: #ffffff;
  padding: 2rem;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.4rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`

export const SectionTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.9rem;
  font-weight: 900;
`

export const SectionDescription = styled.p`
  margin: 0.55rem 0 0;
  color: #667085;
  font-size: 1.28rem;
  line-height: 1.55;
`

export const ActionButton = styled.button`
  border: none;
  border-radius: 1.2rem;
  background: #5db7d8;
  color: white;
  padding: 1.05rem 1.7rem;
  font-size: 1.35rem;
  font-weight: 900;
  cursor: pointer;
  transition: 0.15s ease;
  box-shadow: 0 6px 14px rgba(93, 183, 216, 0.24);

  &:hover:not(:disabled) {
    background: #43a7ca;
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    color: #7b8797;
    background: #d9e2ec;
    box-shadow: none;
    transform: none;
  }
`

export const WifiGrid = styled.div`
  display: grid;
  gap: 1.1rem;
  margin-top: 1.6rem;
  max-height: 36rem;
  overflow-y: auto;
  padding-right: 0.4rem;
`

export const WifiCard = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.6rem;
  border: 1px solid #e3e8ef;
  border-radius: 1.8rem;
  background: #ffffff;
  padding: 1.55rem 1.6rem;
  text-align: left;
  cursor: pointer;
  transition: 0.15s ease;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.03);

  &:hover {
    border-color: #cfd8e5;
    background: #f8fafc;
  }

  &.active {
    border-color: #5db7d8;
    background: #f0fbff;
    box-shadow: 0 0 0 3px rgba(93, 183, 216, 0.16);
  }
`

export const WifiMain = styled.div`
  min-width: 0;
  flex: 1;
`

export const WifiNameRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem;
`

export const WifiName = styled.div`
  max-width: 42rem;
  overflow: hidden;
  color: #1f2937;
  font-size: 1.55rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const WifiMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
`

export const WifiChip = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.42rem 0.8rem;
  color: #667085;
  background: #f2f5f8;
  font-size: 1.12rem;
  font-weight: 800;
  ${({ tone }) =>
    tone === 'green' &&
    css`
      color: #178a4b;
      background: #e8f7ef;
    `}
  ${({ tone }) =>
    tone === 'blue' &&
    css`
      color: #1681a7;
      background: #eaf6fb;
    `}
`

export const SignalBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  padding-top: 0.25rem;
`

export const SignalBar = styled.div`
  width: 0.55rem;
  border-radius: 999px;
  background: #d8dee8;
  height: ${({ height }) => `${height * 0.6 + 0.6}rem`};

  &.on {
    background: #5db7d8;
  }
`

export const EmptyState = styled.div`
  margin-top: 1.6rem;
  border: 1px dashed #cfd8e5;
  border-radius: 1.8rem;
  background: #f8fafc;
  padding: 4rem 2rem;
  text-align: center;

  h4 {
    margin: 1.2rem 0 0;
    color: #1f2937;
    font-size: 1.55rem;
    font-weight: 900;
  }

  p {
    margin: 0.6rem 0 0;
    color: #667085;
    font-size: 1.25rem;
  }
`

export const EmptyIcon = styled.div`
  width: 4.6rem;
  height: 4.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3e8ef;
  border-radius: 999px;
  background: white;
  font-size: 2.2rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
`

export const ConnectPanel = styled.div`
  margin-top: 2rem;
  border: 1px solid #e1e6ef;
  border-radius: 2rem;
  background: #f8fafc;
  padding: 2rem;
`

export const ConnectPanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.4rem;
  margin-bottom: 1.6rem;

  h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.75rem;
    font-weight: 900;
  }

  p {
    margin: 0.55rem 0 0;
    color: #667085;
    font-size: 1.3rem;
    line-height: 1.55;
  }
`

export const PasswordField = styled.div`
  position: relative;
  width: 100%;
`

export const PasswordInput = styled.input`
  width: 100%;
  border: 1px solid #cfd8e5;
  border-radius: 1.2rem;
  background: white;
  color: #1f2937;
  outline: none;
  padding: 1.15rem 5rem 1.15rem 1.3rem;
  font-size: 1.35rem;
  transition: 0.15s ease;

  &:focus {
    border-color: #5db7d8;
    box-shadow: 0 0 0 4px rgba(93, 183, 216, 0.16);
  }
`

export const TogglePasswordButton = styled.button`
  position: absolute;
  top: 50%;
  right: 0.8rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.6rem;
  height: 3.6rem;
  border: none;
  border-radius: 1rem;
  background: transparent;
  color: #667085;
  font-size: 1.65rem;
  cursor: pointer;
  transition: 0.15s ease;

  &:hover {
    background: #eef7fb;
    color: #1681a7;
  }

  &:focus-visible {
    outline: 2px solid #5db7d8;
    outline-offset: 2px;
  }
`

export const ButtonWrap = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.8rem;

  &.alignLeft {
    justify-content: flex-start;
  }

  &.alignRight {
    justify-content: flex-end;
  }

  &.alignCenter {
    justify-content: center;
  }
`

export const SwitchingPanel = styled.div`
  display: flex;
  gap: 1.8rem;
  margin-top: 2rem;
  border-radius: 2rem;
  background: linear-gradient(135deg, #5db7d8 0%, #32b8c8 100%);
  color: white;
  padding: 2.2rem;
  box-shadow: 0 14px 30px rgba(50, 184, 200, 0.24);
`

export const SwitchingIcon = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.2rem;
  height: 5.2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 2.4rem;
`

export const SwitchingContent = styled.div`
  flex: 1;

  > span {
    display: block;
    color: rgba(255, 255, 255, 0.78);
    font-size: 1.15rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0.45rem 0 0;
    color: white;
    font-size: 2.25rem;
    font-weight: 900;
  }

  p {
    margin: 1.1rem 0 0;
    max-width: 78rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.35rem;
    line-height: 1.75;
  }
`

export const ReconnectBox = styled.div`
  margin-top: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 1.4rem;
  background: rgba(255, 255, 255, 0.12);
  padding: 1.25rem 1.4rem;

  span {
    display: block;
    color: rgba(255, 255, 255, 0.76);
    font-size: 1.1rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
`

export const ReconnectLink = styled.a`
  display: block;
  margin-top: 0.5rem;
  color: white;
  font-size: 1.45rem;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 0.35rem;
  word-break: break-all;
`

export const CountdownPill = styled.div`
  display: inline-flex;
  align-items: center;
  margin-top: 1.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  padding: 0.65rem 1.05rem;
  color: white;
  font-size: 1.25rem;
  font-weight: 900;
`

export const SimplePanel = styled.div`
  margin-top: 1.4rem;
  border: 1px solid #e1e6ef;
  border-radius: 1.8rem;
  background: #f8fafc;
  padding: 1.8rem;
`

export const MiniButton = styled.button`
  border: none;
  border-radius: 1.1rem;
  background: #5db7d8;
  color: white;
  padding: 1rem 1.6rem;
  font-size: 1.3rem;
  font-weight: 900;
  cursor: pointer;

  &:hover {
    background: #43a7ca;
  }
`

export const SmallNote = styled.div`
  margin-top: 0.2rem;
  border: 1px solid #e3e8ef;
  border-radius: 1.4rem;
  background: #f8fafc;
  padding: 1.3rem 1.5rem;
  color: #667085;
  font-size: 1.2rem;
  line-height: 1.6;
`

// Compatibility exports for older imports/usages.
export const HeaderRow = SectionHeader
export const WifiList = WifiGrid
export const WifiItem = WifiCard
export const ConnectArea = ConnectPanel
// import styled from 'styled-components'

// export const StyledPageContent = styled.div`
//   display: flex;
//   flex-direction: column;
//   gap: 1.6rem;
//   padding: 2.4rem;
//   width: 100%;

//   /* ✅ 전체 페이지 스크롤 허용 */
//   height: auto;
//   min-height: 100%;
//   overflow: visible;
// `

// export const HeaderRow = styled.div`
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
// `

// export const WifiList = styled.div`
//   border: 1px solid #ddd;
//   border-radius: 8px;
//   max-height: 320px;           /* ✅ 약 10개 표시 */
//   overflow-y: auto;
// `

// export const WifiItem = styled.div`
//   padding: 12px 16px;
//   font-size: 1.7rem;             /* ✅ 글자 키움 */
//   display: flex;
//   justify-content: space-between;
//   cursor: pointer;

//   &:hover {
//     background: #f5f7fa;
//   }

//   &.active {
//     background: #e8f2ff;
//     font-weight: 600;
//   }
// `

// export const ConnectArea = styled.div`
//   margin-top: 1.6rem;
//   display: flex;
//   flex-direction: column;
//   gap: 1rem;
// `

// export const ButtonWrap = styled.div`
//   display: flex;
//   gap: 1rem;
//   margin-bottom: 2rem;
//   margin-top: 2rem;

//   &.alignLeft {
//     justify-content: flex-start;
//   }

//   &.alignRight {
//     justify-content: flex-end;
//   }

//   &.alignCenter {
//     justify-content: center;
//   }
// `
