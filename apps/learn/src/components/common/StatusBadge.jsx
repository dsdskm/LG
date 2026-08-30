import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const colorMap = {
  success: '#51CF66',
  failed: '#FF6B6B',
  retry: '#FCC419',
  running: '#4A90D9',
  queued: '#868E96',
  completed: '#51CF66',
  'review-pending': '#FCC419',
  approved: '#51CF66',
  rejected: '#FF6B6B',
  accepted: '#51CF66',
  pending: '#FCC419'
}

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ status }) => `${colorMap[status] || '#868E96'}22`};
  color: ${({ status }) => colorMap[status] || '#868E96'};
  border: 1px solid ${({ status }) => `${colorMap[status] || '#868E96'}44`};

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ status }) => colorMap[status] || '#868E96'};
  }
`

const STATUS_KEYS = {
  success: 'success',
  failed: 'failed',
  retry: 'retry',
  running: 'running',
  queued: 'queued',
  completed: 'completed',
  'review-pending': 'reviewPending',
  approved: 'approved',
  rejected: 'rejected',
  accepted: 'accepted',
  pending: 'pending'
}

export default function StatusBadge({ status, label }) {
  const { t } = useTranslation('learn')
  const key = STATUS_KEYS[status]
  return <Badge status={status}>{label || (key ? t(`status.${key}`) : status)}</Badge>
}
