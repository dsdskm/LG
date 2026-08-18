import styled, { css } from 'styled-components'

export const Page = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 4rem 2rem;
  background: #f3f5f8;
`

export const Card = styled.div`
  width: 100%;
  max-width: 56rem;
  border: 1px solid #e1e6ef;
  border-radius: 2rem;
  background: #ffffff;
  padding: 3rem;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
`

export const Eyebrow = styled.div`
  color: #38a3c7;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export const Title = styled.h2`
  margin: 0.4rem 0 0;
  color: #1f2937;
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.03em;
`

export const SectionTitle = styled.h3`
  margin: 2.8rem 0 0;
  color: #1f2937;
  font-size: 1.7rem;
  font-weight: 900;
`

export const Rows = styled.div`
  display: grid;
  gap: 0.2rem;
  margin-top: 1.2rem;
  border: 1px solid #e3e8ef;
  border-radius: 1.4rem;
  background: #f8fafc;
  padding: 0.6rem 1.4rem;
`

export const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.6rem;
  padding: 1.1rem 0;

  & + & {
    border-top: 1px solid #e6ebf2;
  }
`

export const Label = styled.div`
  flex: 0 0 auto;
  color: #667085;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export const Value = styled.div`
  color: ${({ accent }) => (accent ? '#1681a7' : '#1f2937')};
  font-size: 1.45rem;
  font-weight: 900;
  text-align: right;
  word-break: break-all;
  ${({ mono }) =>
    mono &&
    css`
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
      font-weight: 700;
    `}
`

export const Hint = styled.div`
  margin-top: 0.9rem;
  color: #8a94a6;
  font-size: 1.22rem;
  line-height: 1.55;
`
