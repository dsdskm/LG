import { severityLabelMap, statusLabelMap } from '../../constants'

const statusStyleMap = {
  received: {
    backgroundColor: '#edf1f5',
    color: '#5f6b7c'
  },
  prepared: {
    backgroundColor: '#edf1f5',
    color: '#5f6b7c'
  },
  prepare_failed: {
    backgroundColor: '#fff3e5',
    color: '#e67e22'
  },
  analyze_failed: {
    backgroundColor: '#fff3e5',
    color: '#e67e22'
  },
  failed: {
    backgroundColor: '#ffe8e8',
    color: '#d93025'
  },
  analyzing: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32'
  },
  analyzed: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32'
  },
  completed: {
    backgroundColor: '#e8f7ee',
    color: '#2e7d32'
  }
}

const severityStyleMap = {
  critical: {
    backgroundColor: '#ffe8e8',
    color: '#ff1100'
  },
  high: {
    backgroundColor: '#ffe8e8',
    color: '#d93025'
  },
  medium: {
    backgroundColor: '#fff3e5',
    color: '#e67e22'
  },
  low: {
    backgroundColor: '#fff3e5',
    color: '#e67e22'
  }
}

const statusBadgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: 1,
  padding: '4px 10px',
  whiteSpace: 'nowrap'
}

const severityBadgeBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: 1,
  padding: '4px 10px',
  whiteSpace: 'nowrap'
}

const Badge = ({ kind, value }) => {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()

  let label = value || '-'

  if (kind === 'severity') {
    label = severityLabelMap[normalizedValue] || value || '-'
  }

  if (kind === 'status') {
    label = statusLabelMap[normalizedValue] || value || '-'
  }

  if (kind === 'action') {
    label = value || '-'
  }

  if (kind === 'status') {
    const statusStyle = statusStyleMap[normalizedValue] || {
      backgroundColor: '#edf1f5',
      color: '#5f6b7c'
    }
    return <span style={{ ...statusBadgeBaseStyle, ...statusStyle }}>{label}</span>
  }

  if (kind === 'severity') {
    const severityStyle = severityStyleMap[normalizedValue] || {
      backgroundColor: '#edf1f5',
      color: '#5f6b7c'
    }
    return <span style={{ ...severityBadgeBaseStyle, ...severityStyle }}>{label}</span>
  }

  return <span>{label}</span>
}

export default Badge
