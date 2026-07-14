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
  width: min(1080px, 100%);
  height: calc(100vh - 48px);
  max-height: calc(100vh - 48px);
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #eef2f7;
  background: #fbfcfe;
  flex-shrink: 0;
`

export const ModalTitleWrap = styled.div`
  min-width: 0;
`

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: 24px;
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid #eef2f7;
  background: #ffffff;
  flex-shrink: 0;
`

export const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const FormSection = styled.section`
  border: 1px solid #e8edf5;
  border-radius: 16px;
  background: #ffffff;
  overflow: visible;
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
  min-width: 0;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 16px;
  min-width: 0;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FieldGroup = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
  align-self: start;
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

const controlStyle = css`
  height: 42px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #ffffff;
  padding: 0 14px;
  font-size: 14px;
  color: #111827;
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
  min-width: 0;
`

export const SelectInput = styled.select`
  ${controlStyle}
  width: 100%;
  min-width: 0;
`

export const GhostButton = styled.button`
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
`

export const SecondaryButton = styled.button`
  height: 42px;
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
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
`

export const EditableList = styled.div`
  padding: 16px;
  display: grid;
  gap: 12px;
  min-width: 0;
`

export const FooterHint = styled.div`
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
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

export const EmptyStateSmall = styled.div`
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
`

export const LabelRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

export const HelpTooltip = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`

export const HelpTooltipTrigger = styled.button`
  width: 18px;
  height: 18px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
`

export const HelpTooltipBubble = styled.div`
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%) translateY(4px);
  min-width: 220px;
  max-width: 320px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #111827;
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: normal;
  text-align: left;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    visibility 0.15s ease;
  z-index: 50;

  ${HelpTooltip}:hover & {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    width: 8px;
    height: 8px;
    background: #111827;
    transform: translateX(-50%) rotate(45deg);
  }
`

export const ActionRuleEmptyBox = styled.div`
  min-height: 56px;
  padding: 14px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #fafcff;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
  display: flex;
  align-items: center;
`

export const AssigneeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

export const AssigneeCard = styled.div`
  width: 180px;
  min-height: 120px;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #f9fbff;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const AssigneeName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #111827;
`

export const AssigneeIdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const AssigneeMeta = styled.div`
  display: grid;
  gap: 6px;
  flex: 1;
  align-content: start;
`

export const AssigneeMetaLine = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  word-break: break-word;
`

export const AssigneeActions = styled.div`
  display: flex;
  justify-content: flex-end;
`

export const AssigneeAddRow = styled.div`
  display: grid;
  gap: 8px;
`

export const AssigneeAddLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
`

export const AssigneeSelectWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  min-width: 0;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const TagInputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
  min-width: 0;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
`

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`
