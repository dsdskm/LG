import styled from 'styled-components'

export const ManageActions = styled.div`
  display: flex;
  width: 100%;
  gap: 5px;
  align-items: center;
  justify-content: center;
`

export const BaseActionButton = styled.button`
  min-width: 36px;
  width: auto;
  height: 24px;
  padding: 0 8px;

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
  color: #084298;
  background-color: #cfe2ff;
  border-color: #b6d4fe;

  &:hover:not(:disabled) {
    background-color: #b6d4fe;
    border-color: #9ec5fe;
  }

  &:active:not(:disabled) {
    background-color: #9ec5fe;
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
