import styled from 'styled-components'

export const ArticleStateItem = styled.article`
  min-height: calc(100% - 36px);
  background: ${({ background = 'linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%)' }) => background};
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

export const DivStateHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #2c2d38;
`

export const H4StateText = styled.h4`
  font-size: 1.4rem;
  word-break: keep-all;
  word-wrap: break-word;
  font-weight: 700;
`

export const DivStateCount = styled.div`
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.4rem;
  display: flex;
`

export const StrongStateNumber = styled.strong`
  font-size: 2.7rem;
  line-height: 1.16;
`

export const SpanStateUnit = styled.span`
  font-size: 1.2rem;
  margin-left: 0.2rem;
`

export const SpanSubText = styled.span`
  font-size: 1.2rem;
  color: #8b8d98;
  text-align: right;
  word-break: keep-all;
`
