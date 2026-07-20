import styled from 'styled-components'

export const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
`

export const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`

export const DateInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const DateInput = styled.input`
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  color: #111827;
`

export const PresetButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

export const PresetButton = styled.button`
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? '#2563eb' : '#d0d7de')};
  background-color: ${({ $active }) => ($active ? '#eff6ff' : '#ffffff')};
  color: ${({ $active }) => ($active ? '#2563eb' : '#111827')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: #94a3b8;
  }
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`

export const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
`

export const SummaryValue = styled.div`
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  color: ${({ $tone }) => {
    if ($tone === 'success') return '#059669'
    if ($tone === 'danger') return '#dc2626'
    if ($tone === 'warning') return '#d97706'
    if ($tone === 'primary') return '#2563eb'
    return '#111827'
  }};
`

export const SummaryLabel = styled.div`
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
`

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export const SectionCard = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 280px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  background: #fcfcfd;
`

export const SectionTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #334155;
`

export const SectionBody = styled.div`
  padding: 16px;
  min-width: 0;
`

export const RankingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const RankingRowWrap = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr 36px;
  align-items: center;
  gap: 12px;
`

export const RankingLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const RankingBarTrack = styled.div`
  width: 100%;
  height: 14px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
`

export const RankingBarFill = styled.div`
  width: ${({ $widthPercent }) => `${$widthPercent}%`};
  height: 100%;
  border-radius: 999px;
  background: #2e86c1;
  transition: width 0.2s ease;
`

export const RankingValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-align: right;
`

export const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
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
export const SectionMaxWidth = styled.div`
  width: 100%;
  min-width: 0;
`
