// styles.js
// ✅ 단일 export 원칙 준수 (S / UX / theme / formatTime 각각 1회)
// ✅ Header / Replay / Result / Log UX 모두 호환

// ── theme ────────────────────────────────────────────────────────────
export const theme = {
  colors: {
    bg: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    bgDark: '#EEF2F7',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#14B8A6',
    primaryDark: '#0F766E',
    accent: '#60A5FA',
    statusWarn: '#F59E0B',
    statusError: '#EF4444',
    // ── added (used by UX + OverviewTab notice/badge) ──
    statusOk: '#10B981',
    statusInfo: '#0284C7',
    logInfo: '#E0F2FE',
    logWarn: '#FEF3C7',
    logError: '#FEE2E2'
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.06)'
  }
}

// ── Header styles (S) ────────────────────────────────────────────────
export const S = {
  headerWrap: {
    boxSizing: 'border-box',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#fff',
    borderBottom: '1px solid #E5E7EB',
    position: 'relative',
    zIndex: 100 // 드롭다운/캘린더가 위로 오도록
  },

  topRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },

  title: {
    fontSize: 22,
    fontWeight: 700
  },

  topRow2: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },

  rowGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },

  selectedInfoBox: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: theme.colors.textSecondary,
    padding: '6px 8px',
    background: theme.colors.surfaceAlt,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 8
  }
}

// ── helpers ──────────────────────────────────────────────────────────
export function formatTime(secs) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

// ── UX styles ─────────────────────────────────────────────────────────
export const UX = {
  /* Page / Layout */
  page: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: theme.colors.bg,
    color: theme.colors.text,
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif",
    fontSize: 13,
    lineHeight: 1.4
  },

  layout: {
    width: '100%',
    flex: '1 1 auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2
  },

  mainShell: {
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  main: {
    display: 'flex',
    gap: 8,
    padding: 8,
    flex: '1 1 0',
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 0
  },

  leftPanel: {
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
    minHeight: 0
  },

  rightPanel: {
    width: '50%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },

  vizWrap: { flex: 3, minHeight: 0 },
  ctrlWrap: {
    flexShrink: 0,
    minHeight: 'auto'
  },

  rightEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadow.sm,
    color: theme.colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13
  },

  /* RobotViz Empty */
  vizContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadow.sm,
    display: 'flex'
  },

  vizCenter: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
    padding: 18,
    color: theme.colors.textSecondary
  },

  robotEmoji: { fontSize: 30 },
  vizTitle: { fontSize: 14, fontWeight: 800, color: theme.colors.text },
  vizSub: { fontSize: 12, lineHeight: 1.5 },

  vizBtnRow: {
    display: 'flex',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },

  loadBtnPrimary: {
    height: 28,
    padding: '0 12px',
    borderRadius: 7,
    border: `1px solid ${theme.colors.primaryDark}`,
    background: theme.colors.primary,
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },

  loadBtn: {
    height: 28,
    padding: '0 12px',
    borderRadius: 7,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceAlt,
    color: theme.colors.textSecondary,
    fontWeight: 800,
    cursor: 'pointer'
  },

  vizHint: {
    marginTop: 6,
    fontSize: 10,
    color: theme.colors.textMuted,
    lineHeight: 1.5
  },

  /* Resize + Log */
  resizeHandle: {
    height: 5,
    cursor: 'ns-resize',
    background: 'transparent',
    flexShrink: 0,
    position: 'relative'
  },

  resizeGrip: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 40,
    height: 3,
    borderRadius: 2,
    background: theme.colors.border
  },

  logWrap: {
    minHeight: 80,
    maxHeight: '60vh',
    padding: '0 8px 8px',
    flexShrink: 0,
    overflow: 'hidden'
  },

  logPanel: {
    width: '100%',
    height: '100%',
    background: theme.colors.surface,
    borderRadius: 8,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadow.sm,
    display: 'flex',
    flexDirection: 'column'
  },

  logTopBar: {
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    background: theme.colors.surfaceAlt,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },

  logTableHead: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 1fr',
    gap: 10,
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textMuted,
    fontWeight: 800,
    fontSize: 12
  },

  // ✅ System/Event (Time/Level/Source/Message) 4컬럼 전용
  logTableHead4: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 120px 1fr',
    gap: 10,
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textMuted,
    fontWeight: 800,
    fontSize: 12
  },

  logBody: {
    padding: 8,
    overflow: 'auto',
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  logRow: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 1fr',
    gap: 10,
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface
  },

  // ✅ System/Event 4컬럼 row 전용
  logRow4: {
    display: 'grid',
    gridTemplateColumns: '90px 80px 120px 1fr',
    gap: 10,
    alignItems: 'start',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface
  },

  logMsg: {
    // ✅ 잘림 방지: 줄바꿈 허용 (원하면 line-clamp로 2~3줄 제한 가능)
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.35
  },

  /* Common Cards / Grids */
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },

  card: {
    background: theme.colors.surfaceAlt,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    paddingBottom: 4,
    borderBottom: `1px solid ${theme.colors.border}`
  },

  bar: {
    height: 4,
    background: theme.colors.bgDark,
    borderRadius: 2,
    overflow: 'hidden'
  },

  fill: (pct, color = theme.colors.primary) => ({
    height: '100%',
    width: `${pct}%`,
    background: color,
    borderRadius: 2
  }),

  /* ───────── Tabs common (Overview / ArmAnalysis) ───────── */
  tabGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    height: '100%',
    overflow: 'hidden',
    minHeight: 0
  },

  tabGrid2x2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto auto',
    gap: 10,
    height: '100%',
    overflow: 'hidden',
    minHeight: 0
  },

  cardScroll: {
    background: theme.colors.surfaceAlt,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 8,
    padding: '12px 12px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0
  },

  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme.colors.textMuted,
    paddingBottom: 6,
    borderBottom: `1px solid ${theme.colors.border}`,
    flexShrink: 0,
    minHeight: 0
  },

  sideTitle: (side) => ({
    ...UX.cardTitle,
    color: side === 'right' ? '#7B68EE' : '#2C9E9E'
  }),

  colTight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },

  // Overview 상단 Key/Value 영역도 다른 탭 톤에 맞게 "가볍게"
  kvRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 11
  },
  kvLabel: {
    minWidth: 52,
    fontWeight: 700,
    color: theme.colors.textSecondary
  },
  kvSub: {
    marginLeft: 6,
    fontSize: 11,
    color: theme.colors.textMuted
  },
  blockGap: { marginTop: 8, display: 'grid', gap: 8 },

  // Left Arm 탭의 "리스트 아이템 카드" 톤으로 맞춤
  gaugeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 10,
    padding: '10px 12px',
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 10
  },
  gaugeLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: theme.colors.textSecondary
  },
  gaugeLeft: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  },
  gaugeTitleText: {
    fontWeight: 700,
    color: theme.colors.textSecondary
  },
  gaugePreview: {
    fontSize: 10,
    color: theme.colors.textMuted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '60%'
  },

  gaugeBar: {
    height: 6,
    background: theme.colors.bgDark,
    borderRadius: 999,
    overflow: 'hidden'
  },

  gaugeFill: ({ pct, side, warn, error }) => ({
    height: '100%',
    width: `${pct}%`,
    background: error
      ? theme.colors.statusError
      : warn
        ? theme.colors.statusWarn
        : side === 'right'
          ? '#7B68EE'
          : theme.colors.primary,
    borderRadius: 999
  }),

  badge: ({ ok, warn, error }) => ({
    padding: '2px 8px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 800,
    background: ok ? '#E8F8F0' : warn ? '#FEF9E7' : error ? '#FDECEA' : theme.colors.bgDark,
    color: ok
      ? theme.colors.statusOk
      : warn
        ? theme.colors.statusWarn
        : error
          ? theme.colors.statusError
          : theme.colors.textSecondary,
    border: `1px solid ${ok ? '#B7DFCC' : warn ? '#F9E4A0' : error ? '#F5C0BA' : theme.colors.border}`
  }),

  topicList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflow: 'auto'
  },

  topicRow: {
    // Left Arm 탭의 아이템과 유사한 "흰색 pill 카드"
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    fontSize: 10,
    color: theme.colors.textSecondary
  },

  topicName: {
    fontSize: 10,
    fontFamily: "'Consolas', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Courier New', monospace",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.colors.textSecondary
  },

  dot: (status) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background:
      status === 'ok' ? theme.colors.statusOk : status === 'warn' ? theme.colors.statusWarn : theme.colors.statusError
  }),

  hz: {
    marginLeft: 'auto',
    color: theme.colors.textMuted,
    fontSize: 10,
    fontFamily: "'Consolas', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Courier New', monospace"
  },

  eventItem: {
    display: 'flex',
    gap: 6,
    fontSize: 10,
    padding: '2px 0',
    borderBottom: `1px solid ${theme.colors.border}`
  },

  eventTime: {
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    flexShrink: 0
  },

  eventMsg: (level) => ({
    color: level === 'ERROR' ? theme.colors.statusError : level === 'WARN' ? theme.colors.statusWarn : theme.colors.text
  }),

  placeholderBox: {
    flex: 1,
    background: theme.colors.bgDark,
    borderRadius: 6,
    fontSize: 11,
    color: theme.colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  cmdItem: ({ warn, error }) => ({
    fontSize: 10,
    fontFamily: "'Consolas', monospace",
    padding: '3px 5px',
    background: error ? theme.colors.logError : warn ? theme.colors.logWarn : theme.colors.surface,
    borderLeft: `2px solid ${error ? theme.colors.statusError : warn ? theme.colors.statusWarn : theme.colors.border}`,
    borderRadius: '0 4px 4px 0',
    color: theme.colors.textSecondary
  }),

  noticePill: (variant) => ({
    marginTop: 4,
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 5,
    fontWeight: 600,
    background:
      variant === 'warn' ? theme.colors.logWarn : variant === 'error' ? theme.colors.logError : theme.colors.logInfo,
    color:
      variant === 'warn'
        ? theme.colors.statusWarn
        : variant === 'error'
          ? theme.colors.statusError
          : theme.colors.statusInfo
  }),

  analysisLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.6)',
    zIndex: 5
  },

  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 10,
    background: '#fff',
    border: `1px solid ${theme.colors.border}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.textSecondary
  },

  spinner: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: `3px solid ${theme.colors.border}`,
    borderTopColor: theme.colors.primary,
    animation: 'spin 0.9s linear infinite'
  }
}
