import styled from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
`

export const TitleWrap = styled.div`
  min-width: 0;
`

export const PageDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const controlStyle = `
  height: 42px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #ffffff;
  padding: 0 14px;
  font-size: 14px;
  color: #111827;
`

export const SearchInput = styled.input`
  ${controlStyle}
  min-width: 260px;
`

export const TeamSelect = styled.select`
  ${controlStyle}
  min-width: 170px;
`

export const FuncFilterSelect = styled.select`
  ${controlStyle}
  min-width: 190px;
`

export const AddButton = styled.button`
  height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

export const SummaryText = styled.div`
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
`

export const ListPanel = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
`

export const ListHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1.1fr) minmax(240px, 1fr) minmax(140px, 0.7fr) minmax(160px, 0.8fr) minmax(
      180px,
      0.8fr
    );
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;

  @media (max-width: 1080px) {
    display: none;
  }
`

export const HeaderCell = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #475569;
`

export const ListBody = styled.div`
  display: grid;
`

export const ListRow = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1.1fr) minmax(240px, 1fr) minmax(140px, 0.7fr) minmax(160px, 0.8fr) minmax(
      180px,
      0.8fr
    );
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 1080px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
`

export const Cell = styled.div`
  min-width: 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.5;

  @media (max-width: 1080px) {
    display: grid;
    gap: 2px;
  }
`

export const MobileLabel = styled.span`
  display: none;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;

  @media (max-width: 1080px) {
    display: inline;
  }
`

export const ProfileCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
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

export const NameWrap = styled.div`
  min-width: 0;
  display: grid;
  gap: 2px;
`

export const NameText = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ProfileHint = styled.div`
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
`

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
`

export const ActionButton = styled.button`
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const DeleteButton = styled(ActionButton)`
  border-color: #fecaca;
  background: #fff1f2;
  color: #b91c1c;
`

export const ConfirmDeleteButton = styled.button`
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
`

export const LoadingBox = styled.div`
  margin-top: 8px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
`

export const ErrorBox = styled.div`
  margin-top: 8px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.6;
`

export const FormModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const FormModalCard = styled.div`
  width: min(680px, 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  padding: 20px;
  display: grid;
  gap: 12px;
`

export const FormModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  color: #111827;
`

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const FieldGroup = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
  ${({ $span2 }) => ($span2 ? 'grid-column: 1 / -1;' : '')}
`

export const FieldLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #475569;
`

export const FieldInput = styled.input`
  width: 100%;
  height: 40px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f9fbff;
  padding: 0 12px;
  font-size: 13px;
  color: #334155;
`

export const FieldSelect = styled.select`
  width: 100%;
  height: 40px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  color: #334155;
`

export const FileInput = styled.input`
  width: 100%;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #ffffff;
  padding: 8px 10px;
  font-size: 13px;
  color: #334155;
`

export const FileMeta = styled.div`
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`

export const ClearFileButton = styled.button`
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`

export const FieldTextarea = styled.textarea`
  width: 100%;
  min-height: 90px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #f9fbff;
  padding: 10px 12px;
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
`

export const FormModalError = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.5;
`

export const FormModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export const SecondaryButton = styled.button`
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

export const CompleteModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

export const CompleteModalCard = styled.div`
  width: min(420px, 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  padding: 20px;
  display: grid;
  gap: 10px;
`

export const CompleteModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  color: #111827;
`

export const CompleteModalDescription = styled.p`
  margin: 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
`

export const CompleteModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
`

export const PrimaryButton = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`
