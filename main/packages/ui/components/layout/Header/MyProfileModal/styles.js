import styled from 'styled-components'

export const StyledOverlay = styled.div`
  position: fixed;
  top: var(--header-height, 6rem);
  left: ${({ $sideBarWidth }) => $sideBarWidth};
  right: 0;
  bottom: 0;
  background: var(--t-page-bg);
  overflow-y: auto;
  z-index: 95;

  /* Tooltip 스타일 */
  .react-tooltip {
    max-width: 24rem !important;
    white-space: normal !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
    padding: 0.8rem 1rem !important;
  }
`

export const StyledTopBar = styled.header`
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.4rem;
  background: var(--t-page-bg);
  border-bottom: 1px solid var(--color-neutral-20);
  z-index: 1;
`

export const StyledTitle = styled.h1`
  display: flex;
  align-items: center;
  min-height: 3.6rem;
  font-size: var(--font-size-heading-3);
  line-height: var(--line-height-heading-3);
  font-weight: 700;
  color: var(--color-neutral-90);
`

export const StyledCloseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-xs);
  color: var(--color-neutral-70);
  font-size: var(--font-size-body-5);
  font-weight: 500;

  &:hover {
    background: var(--color-secondary-10);
  }
`

export const StyledContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  max-width: 120rem;
  margin: 0;
  padding: 1.6rem 2.4rem 2.4rem 2.4rem;

  @media all and (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }

  @media all and (max-width: 767px) {
    padding: 1.6rem;
  }
`

export const StyledMainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 2 1 0;
  min-width: 0;
`

export const StyledSideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 1 1 0;
  min-width: 0;

  @media all and (max-width: 900px) {
    flex: 1 1 auto;
    width: 100%;
  }
`

export const StyledCard = styled.section`
  background: var(--color-neutral-10);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-00);
  padding: 2.4rem;
`

export const StyledCardTitle = styled.h2`
  font-size: var(--font-size-body-4);
  font-weight: 700;
  color: var(--color-neutral-90);
  margin-bottom: 1.6rem;
`

export const StyledField = styled.div`
  & + & {
    margin-top: 2rem;
  }
`

export const StyledFieldLabel = styled.div`
  font-size: var(--font-size-body-6);
  color: var(--color-neutral-60);
  margin-bottom: 0.6rem;
`

export const StyledFieldHint = styled.p`
  font-size: var(--font-size-body-6);
  color: var(--color-neutral-50);
  margin-top: 0.6rem;
`

export const StyledRoleHint = styled.p`
  padding-top: 0.6rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px solid var(--color-neutral-15);
  font-size: var(--font-size-body-6);
  color: var(--color-neutral-50);
  margin: 0;
`

export const StyledFieldBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 1.1rem 1.4rem;
  border-radius: var(--radius-sm);
  border: 1px solid ${({ $muted }) => ($muted ? 'transparent' : 'var(--color-neutral-20)')};
  background: ${({ $muted }) => ($muted ? 'var(--color-neutral-15)' : 'var(--color-neutral-10)')};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--font-size-body-5);
    color: ${({ $muted }) => ($muted ? 'var(--color-neutral-60)' : 'var(--color-neutral-80)')};

    &:read-only {
      cursor: default;
    }
  }
`

export const StyledFieldActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`

export const StyledIconAction = styled.button`
  display: inline-flex;
  padding: 0.3rem;
  border-radius: var(--radius-xs);
  color: var(--color-neutral-50);

  &:hover {
    background: var(--color-secondary-10);
    color: var(--color-neutral-70);
  }
`

export const StyledInfoBox = styled.div`
  border: 1px solid var(--color-neutral-20);
  border-radius: var(--radius-sm);
  background: var(--color-neutral-10);
  overflow: hidden;
`

export const StyledInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.6rem;
  padding: 1.2rem 1.6rem;

  & + & {
    border-top: 1px solid var(--color-neutral-15);
  }
`

export const StyledInfoLabel = styled.span`
  font-size: var(--font-size-body-5);
  color: var(--color-neutral-60);
`

export const StyledInfoValue = styled.span`
  font-size: var(--font-size-body-5);
  color: var(--color-neutral-90);
  font-weight: 500;
  text-align: right;
`

export const StyledStatusValue = styled(StyledInfoValue)`
  color: var(--color-success-70);
`

export const StyledPasswordFormSection = styled.div`
  border: 1px solid var(--color-neutral-20);
  border-radius: var(--radius-sm);
  padding: 1.6rem;
  background: var(--color-neutral-15);
  margin: 1.2rem 0;
`

export const StyledPasswordActions = styled.div`
  display: flex;
  gap: 1.2rem;
  margin-top: 2rem;
  margin-bottom: 1.2rem;

  & > button {
    flex: 1;
  }
`

export const StyledTipBox = styled.div`
  margin-top: 2rem;
  padding: 1.6rem;
  background: var(--color-information-15);
  border-radius: var(--radius-md);
`

export const StyledTipList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-left: 1.6rem;
  list-style: disc;

  li {
    font-size: var(--font-size-body-6);
    color: var(--color-information-90);
    line-height: 1.5;
  }
`

export const StyledActionItem = styled.button`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  width: 100%;
  padding: 1.4rem 1.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid ${({ $danger }) => ($danger ? 'var(--color-error-30)' : 'var(--color-neutral-20)')};
  background: ${({ $danger }) => ($danger ? 'transparent' : 'var(--color-neutral-10)')};
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ $danger }) => ($danger ? 'var(--alpha-error-10)' : 'var(--color-secondary-15)')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  & + & {
    margin-top: 1.2rem;
  }
`

export const StyledPasswordActionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
  width: 100%;
  padding: 1.4rem 1.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-neutral-20);
  background: var(--color-neutral-10);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-bottom: 1.2rem;

  &:hover {
    background: var(--color-secondary-15);
  }

  & + & {
    margin-top: 1.2rem;
  }
`

export const StyledActionTitle = styled.div`
  font-size: var(--font-size-body-5);
  font-weight: 600;
  color: ${({ $danger }) => ($danger ? 'var(--color-error-70)' : 'var(--color-neutral-90)')};
`

export const StyledActionDesc = styled.div`
  font-size: var(--font-size-body-6);
  color: var(--color-neutral-50);
  margin-top: 0.2rem;
`

export const StyledEditableInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex: 1;
  min-width: 0;

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--font-size-body-5);
    color: var(--color-neutral-80);
    text-align: right;

    &:read-only {
      cursor: default;
      color: var(--color-neutral-60);
    }
  }
`

export const StyledGuideButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  margin-left: 0.8rem;
  border-radius: var(--radius-xs);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-neutral-50);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-secondary-10);
    color: var(--color-neutral-70);
  }

  &:active {
    background: var(--color-secondary-20);
  }
`
