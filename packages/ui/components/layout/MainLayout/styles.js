import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-background);
`

export const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
`

export const MainContent = styled.main`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  position: relative;
`

export const StyledLayout = styled.div`
  --header-height: 6rem;
  --sidebar-width: ${({ $compact }) => `${$compact ? 8 : 24}rem`};

  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-areas:
    'header  header     header'
    'sideBar scrollArea assistant';
  grid-template-rows: var(--header-height) 1fr;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr) auto;

  & > .header {
    position: relative;
    grid-area: header;
    z-index: 100;
  }

  & > .sideBar {
    position: relative;
    grid-area: sideBar;
    z-index: 90;
  }

  & > .scrollArea {
    position: relative;
    grid-area: scrollArea;
    z-index: 80;
    min-width: 0;
    min-height: 0;
    overflow: hidden;

    & > .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      padding: 2.4rem 32px;
    }

    @media all and (max-width: 767px) {
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        cursor: pointer;
        z-index: 91;
        pointer-events: ${({ $sideBarOpen }) => ($sideBarOpen ? 'auto' : 'none')};
        display: ${({ $sideBarOpen }) => ($sideBarOpen ? 'block' : 'none')};
      }
    }
  }

  & > .aiAssistantPanel {
    position: relative;
    grid-area: assistant;
    z-index: 85;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
  }

  @media all and (max-width: 767px) {
    grid-template-areas:
      'header  header'
      'sideBar scrollArea';
    grid-template-columns: 0 1fr;

    & > .sideBar {
      position: absolute;
      width: var(--sidebar-width);
      left: ${({ $compact }) => `${$compact ? 'calc(var(--sidebar-width) * -1)' : 0}`};
      transition: 0.3s;
    }

    & > .scrollArea > .main {
      padding: 16px;
    }

    & > .aiAssistantPanel {
      display: none;
    }
  }
`
