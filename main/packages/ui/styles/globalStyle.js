import { createGlobalStyle } from 'styled-components'
import reset from 'styled-reset'
import typography from './typography'

const GlobalStyle = createGlobalStyle`
  ${reset}
  ${typography}
  * {
    box-sizing: border-box;
    font-size: inherit;
    line-height: inherit;
    color: inherit;
    font-family: inherit;
  }

  html {
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 10px;
  }

  body {
    margin: 0;
    width: 100%;
    font-size: 1.6rem;
    background: var(--color-secondary-10);
    height: calc(var(--viewport-height) * 100);
    overflow: hidden;

    & > #root {
      position: relative;
      width: 100%;
      height: 100%;
    }

  }

  a {
    text-decoration: none;
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  li {
    list-style: none;
  }
`

export default GlobalStyle
