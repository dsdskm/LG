import styled from 'styled-components'

const toneStyleMap = {
  default: {
    background: 'linear-gradient(197.77deg, #fffeff 18.23%, #f1f8ff 84.66%)',
    borderColor: 'rgba(172, 173, 188, 0.3)',
    valueColor: '#0f172a'
  },

  critical: {
    background: 'linear-gradient(197.77deg, #fff5f5 18.23%, #ffe5e5 84.66%)',
    borderColor: '#ffb3b3',
    valueColor: '#e60000'
  },

  high: {
    background: 'linear-gradient(197.77deg, #fff8f5 18.23%, #fff0eb 84.66%)',
    borderColor: '#ffccbc',
    valueColor: '#d84315'
  },

  medium: {
    background: 'linear-gradient(197.77deg, #fffaf2 18.23%, #fff3dd 84.66%)',
    borderColor: '#ffe0b2',
    valueColor: '#fb8c00'
  },

  low: {
    background: 'linear-gradient(197.77deg, #fffef4 18.23%, #fff9db 84.66%)',
    borderColor: '#fff59d',
    valueColor: '#f9a825'
  }
}

const getToneStyle = ($tone = 'default') => {
  return toneStyleMap[$tone] || toneStyleMap.default
}

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
`

export const SummaryCard = styled.div`
  min-height: 88px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid ${({ $tone = 'default' }) => getToneStyle($tone).borderColor};
  background: ${({ $tone = 'default' }) => getToneStyle($tone).background};
  box-shadow: 0 0 15px 0 rgba(173, 173, 173, 0.2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
`

export const SummaryLabel = styled.div`
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const SummaryValue = styled.div`
  display: flex;
  align-items: flex-end;
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ $tone = 'default' }) => getToneStyle($tone).valueColor};
  white-space: nowrap;
`

export const SummaryUnit = styled.span`
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  color: #64748b;
  margin-left: 4px;
`
