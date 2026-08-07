import styled, { keyframes } from 'styled-components'

export const ManageActions = styled.div`
  display: inline-flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
`

// ExpandableSection 헤더 버튼의 hover 시 밑줄 제거 (밑줄은 버튼이 그리므로 버튼에서 덮어써야 함)
export const NoUnderlineExpandable = styled.div`
  .selectButton:hover:not(:disabled) {
    text-decoration: none;
  }
`

export const BaseActionButton = styled.button`
  min-width: 36px;
  height: 24px;

  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;

  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;

  cursor: pointer;

  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35); /* 접근성 포커스 링 */
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const ApproveButton = styled(BaseActionButton)`
  color: #0f5132;
  background-color: #d1e7dd;
  border-color: #badbcc;

  &:hover:not(:disabled) {
    background-color: #bcd4c9;
    border-color: #a8cdbb;
  }

  &:active:not(:disabled) {
    background-color: #a9c7bb;
  }
`

export const RejectButton = styled(BaseActionButton)`
  color: #842029;
  background-color: #f8d7da;
  border-color: #f5c2c7;

  &:hover:not(:disabled) {
    background-color: #f1bfc4;
    border-color: #f0aeb5;
  }

  &:active:not(:disabled) {
    background-color: #e9a8ae;
  }
`

export const ReApproveButton = styled(BaseActionButton)`
  color: #664d03;
  background-color: #fff3cd;
  border-color: #ffecb5;

  &:hover:not(:disabled) {
    background-color: #ffe69c;
    border-color: #ffda6a;
  }

  &:active:not(:disabled) {
    background-color: #ffdd7a;
  }
`

export const SuspendButton = styled(BaseActionButton)`
  color: #7a3e00;
  background-color: #ffe5d0;
  border-color: #ffd0a8;

  &:hover:not(:disabled) {
    background-color: #ffcf9e;
    border-color: #ffb869;
  }

  &:active:not(:disabled) {
    background-color: #ffb36a;
  }
`

export const EditButton = styled(BaseActionButton)`
  color: var(--color-primary-60, #0073e6);
  background-color: transparent;
  border-color: var(--color-primary-40, #90c0f8);

  &:hover:not(:disabled) {
    background-color: var(--color-primary-10, #e8f3ff);
    border-color: var(--color-primary-60, #0073e6);
  }

  &:active:not(:disabled) {
    background-color: var(--color-primary-20, #cce3ff);
  }
`

export const DeleteButton = styled(BaseActionButton)`
  color: #842029;
  background-color: #f8d7da;
  border-color: #f5c2c7;

  &:hover:not(:disabled) {
    background-color: #f1bfc4;
    border-color: #f0aeb5;
  }

  &:active:not(:disabled) {
    background-color: #e9a8ae;
  }
`

export const AddButton = styled(BaseActionButton)`
  color: #fff;
  background-color: var(--color-primary-60, #0073e6);
  border-color: var(--color-primary-60, #0073e6);

  &:hover:not(:disabled) {
    background-color: var(--color-primary-70, #005bb5);
    border-color: var(--color-primary-70, #005bb5);
  }

  &:active:not(:disabled) {
    background-color: var(--color-primary-80, #004a94);
  }
`

export const PlayButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  padding: 3px 8px;
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
  gap: 4px;

  padding: 3px 8px;
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
