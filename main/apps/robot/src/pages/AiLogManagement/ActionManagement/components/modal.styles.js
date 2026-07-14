import styled, { css } from 'styled-components'

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.42);
  overflow: hidden;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const ModalContainer = styled.div`
  width: min(860px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #eef2f7;
  background: #fbfcfe;
`

export const ModalTitleWrap = styled.div`
  min-width: 0;
`

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  color: #111827;
`

export const ModalDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
`

export const ModalCloseButton = styled.button`
  width: 40px;
  height: 40px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
`

export const ModalBody = styled.div`
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8fafc;
`

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid #eef2f7;
  background: #ffffff;

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`

export const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-end;
  }
`

export const FormSection = styled.section`
  border: 1px solid #e8edf5;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  min-width: 0;
`

export const FormSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #fcfcfd;
`

export const FormSectionTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #334155;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  min-width: 0;
`

export const FieldGroup = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;

  ${({ $span2 }) => ($span2 ? 'grid-column: 1 / -1;' : '')}
`

export const FieldLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`

const inputStyle = css`
  width: 100%;
  min-width: 0;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #f9fbff;
  padding: 12px 14px;
  font-size: 14px;
  color: #334155;
`

const selectStyle = css`
  ${inputStyle}
  background: #ffffff;
`

export const FieldInput = styled.input`
  ${inputStyle}
  height: 44px;
`

export const FieldTextarea = styled.textarea`
  ${inputStyle}
  min-height: 110px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
`

export const SecondaryButton = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

export const DangerGhostButton = styled.button`
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
`

export const EmptyStateSmall = styled.div`
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
`

export const EditableList = styled.div`
  padding: 16px;
  display: grid;
  gap: 12px;
`

export const HookMethodSelect = styled.select`
  ${selectStyle}
  height: 44px;
`

export const ModalErrorMessage = styled.div`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.5;
`

export const FieldHint = styled.div`
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
`

export const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const Chip = styled.button`
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#dbe3ef')};
  background: ${({ $active }) => ($active ? '#2563eb' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#475569')};

  &:hover {
    border-color: #2563eb;
  }
`
