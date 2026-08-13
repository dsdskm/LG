import styled from 'styled-components'

export const StyledJSONEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;

  .label {
    color: var(--color-neutral-70);
  }
`

export const StyledJSONEditorContainer = styled.div`
  border: 1px solid var(--color-${({ $error }) => ($error ? 'error-70' : 'secondary-20')});
  border-radius: var(--radius-md);
  background: var(--color-neutral-10);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: var(--color-secondary-80);
    outline: 2px solid var(--color-secondary-80);
    outline-offset: -2px;
  }
`

export const StyledJSONEditorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 1.6rem;
  background: var(--color-secondary-10);
  border-bottom: 1px solid var(--color-secondary-20);
`

export const StyledTabContainer = styled.div`
  display: flex;
  gap: 1.2rem;
`

export const StyledTabButton = styled.button`
  padding: 0.6rem 0.8rem;
  background: none;
  border: none;
  font-size: var(--font-size-body-6);
  line-height: var(--line-height-body-6);
  color: ${({ $active }) => ($active ? 'var(--t-tab-active)' : 'var(--color-neutral-50)')};
  font-weight: ${({ $active }) => ($active ? '700' : '400')};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--t-tab-active);
    transform: scaleX(${({ $active }) => ($active ? '1' : '0')});
    transition: transform 0.2s ease;
  }

  &:hover {
    color: var(--t-tab-active);
  }
`

export const StyledEditorContent = styled.div`
  padding: 1.2rem 1.6rem;
  height: ${({ $height }) => $height || '30rem'};
  overflow: auto;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: var(--font-size-body-5);
  line-height: var(--line-height-body-5);

  /* uiw react-json-view customization */
  .w-rjv {
    font-family: inherit;
    font-size: inherit;
    background: transparent !important;
  }

  textarea {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    color: var(--color-neutral-80);
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    margin: 0;
  }
`

export const StyledErrorMessage = styled.div`
  font-size: var(--font-size-body-6);
  line-height: var(--line-height-body-6);
  color: var(--color-error-70);
  padding: 0.4rem 1.6rem;
`
