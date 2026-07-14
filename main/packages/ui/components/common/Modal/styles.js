import styled from 'styled-components'

export const StyledModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 24px;
  background-color: var(--alpha-black-60);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 200;

  @media all and (max-width: 767px) {
    padding: 0 16px;
  }
`

export const StyledModalWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  max-width: ${({ $size }) => {
    switch ($size) {
      case 'md':
        return '68rem'
      case 'lg':
        return '80rem'
      case 'xl':
        return '99rem'
      case 'sm':
      default:
        return '54rem'
    }
  }};
  width: 100%;
  margin: 4.2rem auto;

  box-sizing: content-box;
`

export const StyledModalContent = styled.div`
  border-radius: var(--radius-md);
  background-color: var(--color-neutral-10);
  box-shadow: var(--shadow-03);
`

export const StyledModalContentHeader = styled.header`
  padding: ${({ $headerSize }) => ($headerSize === 'lg' ? '2.4rem' : $headerSize === 'md' && '1.65rem')};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  & + div {
    padding-top: 0;
  }
`

export const StyledModalContentBody = styled.div`
  padding: 2.4rem;
`

export const StyledModalContentFooter = styled.footer`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2.4rem;
  flex-wrap: wrap;
  flex-direction: ${({ $footerButtonDirection }) => $footerButtonDirection};

  & > button,
  & > a {
    flex: 1;
    min-width: fit-content;
    width: ${({ $footerButtonDirection }) => ($footerButtonDirection === 'column' ? '100%' : 'auto')};
    max-width: ${({ $footerButtonDirection, $footerButtonLength }) =>
      $footerButtonDirection === 'column' ? 'none' : $footerButtonLength > 1 ? '24rem' : '32rem'};
  }

  @media all and (max-width: 360px) {
    flex-direction: column;

    & > button,
    & > a {
      width: 100%;
      max-width: none;
    }
  }
`

export const StyledModalTitle = styled.div`
  flex-grow: 1;
  font-size: var(--font-size-body-2);
  font-weight: 700;
`
