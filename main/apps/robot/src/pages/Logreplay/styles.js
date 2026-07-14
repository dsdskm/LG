export const S = {
  page: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    background: '#fafafa'
  },

  headerWrap: {
    boxSizing: 'border-box',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#fff',
    borderBottom: '1px solid #E5E7EB',
    // ✅ 헤더에 스택 컨텍스트를 만들어 드롭다운이 위로 오도록
    position: 'relative',
    zIndex: 100
  },

  content: {
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    padding: '12px',
    gap: '8px'
  },

  // ✅ 상단을 세로 플렉스 컨테이너로 변경
  topPane: {
    position: 'relative',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  // ✅ 하단은 남은 공간을 자동으로 채움
  bottomPane: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: 120 // ← 필요 시 0으로 내려서 더 타이트하게도 가능
  },

  // 드래그바 (상/하단 영역 사이)
  dragBar: {
    height: 6,
    background: '#E5E7EB',
    borderRadius: 3,
    cursor: 'row-resize',
    boxShadow: 'inset 0 0 0 1px #d1d5db'
    // marginTop: 4,
    // marginBottom: 4,
  },

  topRow1: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  title: { fontSize: 22, fontWeight: 700 },
  topRow2: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  settingsWrapper: { position: 'relative', display: 'inline-block' },
  iconButton: {
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: 8,
    cursor: 'pointer'
  },
  popover: {
    position: 'absolute',
    top: '38px',
    left: 0,
    minWidth: 180,
    padding: '10px',
    borderRadius: 10,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    zIndex: 10
  },
  popoverHeader: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '2px 0' },
  rowGroup: { display: 'flex', alignItems: 'center', gap: 8 },

  // ✅ 상단 내부: 지도 그리드가 남은 높이를 채우도록 flex:1
  mapsArea: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
    minHeight: 0,
    flex: 1
  },

  legendBox: {
    position: 'absolute',
    right: 0, // ✅ 버튼과 같은 오른쪽 라인에 맞춤
    top: 'calc(100% + 6px)', // ✅ 버튼 컨테이너 바로 아래 6px
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    fontSize: 12,
    lineHeight: '16px',
    color: '#111827',
    zIndex: 5,
    // 접힘 상태에서 내부만 클릭 통과시키되, 토글 버튼은 클릭 가능해야 하므로
    // 컨테이너는 pointerEvents: 'auto' 유지
    pointerEvents: 'auto',
    // 토글 버튼이 겹쳐도 레이아웃 틀어지지 않도록 relative
    positionAnchor: 'top-right' // (참고용, 브라우저 미사용)
  },

  /* 헤더 끝의 범례 토글 버튼(캡슐형: '범례 ⌄' / '범례 ⌃') */
  legendHeaderToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 10px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    color: '#374151',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    /* 살짝 줄인 불투명도로 부담감을 낮춤 */
    opacity: 0.96
  },
  /* 열림 상태일 때 살짝 강조(선택 사항, JSX에서 open에 따라 적용) */
  legendHeaderToggleBtnOpen: {
    borderColor: '#d1d5db',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
  },
  // 접힘 상태: 패딩/보더 최소화, 배경 줄이기
  legendBoxCollapsed: {
    padding: 6,
    background: 'rgba(255,255,255,0.75)',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },

  legendRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
    whiteSpace: 'nowrap' // ✅ 줄바꿈 방지
  },
  gradientBarMini: {
    width: 40,
    height: 8,
    borderRadius: 4,
    background: 'linear-gradient(90deg, rgba(0,200,220,0.20) 0%, rgba(120,80,180,0.45) 55%, rgba(235,0,235,0.80) 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)'
  },

  circleSwatch: (color) => ({
    display: 'inline-block',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: color,
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)'
  }),

  gradientBar: {
    width: 80,
    height: 10,
    borderRadius: 6,
    background: 'linear-gradient(90deg, rgba(0,200,220,0.20) 0%, rgba(120,80,180,0.45) 55%, rgba(235,0,235,0.80) 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)'
  },

  gradientTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    width: 80,
    marginLeft: 4,
    color: '#6B7280',
    fontSize: 10
  },

  dashedBoxSample: {
    display: 'inline-block',
    width: 16,
    height: 12,
    borderRadius: 2,
    background: 'transparent',
    border: '1.5px dashed rgba(0,200,220,0.6)'
  },

  // dwa_goal 십자(+) 마커 샘플 (Foxglove/Lichtblick 스타일 유사 파란색)
  goalCrossSample: {
    display: 'inline-block',
    width: 14,
    height: 14,
    borderRadius: 2,
    // 두 개의 선(세로/가로)을 linear-gradient로 겹쳐서 십자 형태를 만듦
    backgroundImage: 'linear-gradient(#3B82F6, #3B82F6), linear-gradient(#3B82F6, #3B82F6)',
    backgroundSize: '2px 12px, 12px 2px', // 세로 2x12, 가로 12x2
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat',
    boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.35)' // 외곽 미세 강조
  },

  /* ===== Legend 전용: 로봇(방향) 삼각형 아이콘 — Foxglove 스타일 ===== */
  /**
   * 사용: <span style={S.robotTriIcon()} />
   * - fill: #2563EB, stroke: #1E40AF
   * - size(px) 고정, SVG data URI를 배경으로 사용
   */
  robotTriIcon: (size = 14, fill = '#2563EB', stroke = '#1E40AF') => {
    const w = size
    const h = size
    // 위쪽이 '앞'이 되도록 등변삼각형 정점 구성
    const tip = `${w * 0.5},1`
    const left = `2,${h - 2}`
    const right = `${w - 2},${h - 2}`
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      `<polygon points='${tip} ${right} ${left}' fill='${fill}' stroke='${stroke}' stroke-width='2' stroke-linejoin='round' />` +
      `</svg>`
    const uri = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
    return {
      display: 'inline-block',
      width: w,
      height: h,
      backgroundImage: uri,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: `${w}px ${h}px`
    }
  },

  // 토글 버튼: 항상 우측 상단에 떠있고, 클릭 가능해야 함
  legendToggleBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: '999px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    color: '#111827',
    fontSize: 14,
    lineHeight: '22px',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto' // 버튼은 클릭 가능
  },

  mapCard: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#FFFFFF',
    minHeight: 0
  },
  mapHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #F3F4F6',
    background: '#F9FAFB',
    fontSize: 14,
    fontWeight: 600,
    /* ▼ 범례를 헤더 기준으로 붙여 배치하기 위해 기준 컨테이너로 지정 */
    position: 'relative'
  },
  /* 헤더 오른쪽(버튼/라벨 등) 컨테이너 */
  mapHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    position: 'relative' // ✅ 범례 박스의 배치 기준이 되도록
  },
  mapSubLabel: { color: '#6B7280', fontWeight: 500, fontSize: 12, marginRight: 6 }, // ★ 시간 라벨 오른쪽에 기본 여백 추가
  mapBody: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    background: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  mapImage: { width: '100%', height: '100%', userSelect: 'none', cursor: 'grab' },

  /* =========================
   * 3D Map 전용 (DrivingMap3D)
   * ========================= */
  map3DContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    // ✅ 2D mapBody 배경과 통일
    background: '#F3F4F6',
    overflow: 'hidden'
  },
  map3DCanvas: {
    width: '100%',
    height: '100%'
  },
  map3DHint: {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    color: '#9CA3AF',
    pointerEvents: 'none',
    whiteSpace: 'nowrap'
  },
  map3DDebugInfo: {
    position: 'absolute',
    top: 8,
    right: 8,
    // ✅ 가독성 강화(밝은 배경에서도 잘 보이도록)
    fontSize: 12,
    fontWeight: 700,
    color: '#F9FAFB',
    background: 'rgba(17,24,39,0.86)', // slate-900 계열
    border: '1px solid rgba(255,255,255,0.14)',
    padding: '6px 10px',
    borderRadius: 10,
    boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    textShadow: '0 1px 0 rgba(0,0,0,0.35)',
    maxWidth: '70%',
    pointerEvents: 'none'
  },
  map3DControlsHint: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    // ✅ 하단 안내도 같이 가독성 강화
    fontSize: 11,
    fontWeight: 600,
    color: '#E5E7EB',
    background: 'rgba(17,24,39,0.72)',
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '5px 10px',
    borderRadius: 999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap'
  },

  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.66)',
    color: '#374151',
    fontWeight: 600,
    fontSize: 14,
    pointerEvents: 'none'
  },

  // ✅ 플레이바는: 상단 진행바 + 하단 컨트롤(좌/중앙/우)
  playerBarFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '10px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    background: '#FFFFFF',
    width: '100%',
    boxSizing: 'border-box'
  },

  // ✅ 진행바: 가로 전체 확장
  progressWrapFull: {
    position: 'relative',
    width: '100%',
    height: 8,
    borderRadius: 999,
    background: '#E5E7EB',
    overflow: 'hidden',
    cursor: 'pointer'
  },

  playerButton: {
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    minWidth: 36
  },

  // 진행 채움 색
  progressFill: { height: '100%', background: '#10B981' },

  logArea: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    background: '#FFFFFF',
    flex: '1 1 auto', // ⬅️ 남은 공간을 자연스럽게 채움
    minHeight: 0 // ⬅️ 자식 스크롤 박스가 수축되지 않도록
  },

  logHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #F3F4F6',
    background: '#F9FAFB',
    fontSize: 14,
    fontWeight: 600
  },

  logMeta: { color: '#6B7280', fontWeight: 500, fontSize: 12 },

  logBody: {
    padding: '8px 12px',
    // ✅ overflow는 여기에만: longhand로 일관
    overflowX: 'hidden',
    overflowY: 'auto',
    overflowAnchor: 'none',
    contain: 'size layout paint',
    willChange: 'scroll-position',
    scrollbarGutter: 'stable',
    scrollBehavior: 'smooth', // 필요 없으면 'auto'로
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    lineHeight: 1.5,
    background: '#FFFFFF',
    flex: '1 1 auto',
    minHeight: 0
  },

  logLine: { whiteSpace: 'pre-wrap' },

  filterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 12px',
    borderRadius: 10,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB'
  },

  filterGroup: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  /* ====== PlayerBar 전용 추가 ====== */
  playerTopRow: { display: 'block', width: '100%' },
  playerBottomRow: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    gap: 12,
    width: '100%'
  },
  playerLeftBox: {
    justifySelf: 'start',
    color: '#6B7280',
    fontSize: 12,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  playerCenterControls: { justifySelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 },
  playerRightBox: { justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' },

  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
    filter: 'grayscale(50%)',
    transition: 'opacity 120ms ease'
  },

  /* 진행 바 내 버퍼 표시 */
  progressBuffer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(55,65,81,0.35)',
    borderRadius: 999,
    pointerEvents: 'none'
  },

  /* 속도 메뉴 묶음 */
  speedMenu: {
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: '#6B7280',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '4px 6px',
      borderRadius: 6
    },
    caret: {
      display: 'inline-block',
      width: 0,
      height: 0,
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
      borderTop: '5px solid #6B7280',
      transition: 'transform 120ms ease',
      marginTop: 2
    },
    caretOpen: {
      transform: 'rotate(180deg)'
    },
    dropdown: {
      position: 'absolute',
      right: 0,
      top: 'calc(100% + 6px)',
      width: 128,
      maxHeight: 360,
      overflowY: 'auto',
      background: '#111827',
      color: '#E5E7EB',
      border: '1px solid #374151',
      borderRadius: 8,
      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
      padding: 4,
      zIndex: 9999
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '8px 10px',
      fontSize: 12,
      color: '#D1D5DB',
      background: 'transparent',
      borderRadius: 6,
      cursor: 'pointer',
      outline: 'none',
      border: 'none'
    },
    itemSelected: {
      color: '#E5E7EB',
      background: 'rgba(99,102,241,0.18)'
    },
    checkMark: { color: '#A5B4FC', marginLeft: 6 },
    emptyRight: { width: 12 },

    // ===== LogsSection / Highlighter =====
    highlightMark: { background: '#FDE68A', color: '#111827', padding: '0 1px' },

    // ===== Logs containers (mode-specific overrides) =====
    // Plain 모드: 부드러운 스크롤 대신 즉시 스크롤(깜빡임 방지)
    logBodyPlain: { scrollBehavior: 'auto' },
    // Virtual 모드: 바깥 스크롤을 감추고 내부 가상리스트만 스크롤

    logBodyVirtual: {
      position: 'relative'
      // ✅ overflow 계열은 절대 넣지 말 것 (shorthand/longhand 모두 X)
      // virtualization용 translate/height 계산 등의 속성만
    },
    // ===== Log line variants =====
    logLineWarn: { color: '#DC2626', fontWeight: 600 },
    logLineError: { color: '#DC2626' },

    // 툴팁 인라인 스타일(전역 S 수정 없이 최소 추가)
    tooltipWrapStyle: {
      position: 'absolute',
      left: 0,
      top: -24,
      width: '100%',
      pointerEvents: 'none'
    },
    tooltipStyle: {
      position: 'absolute',
      padding: '2px 6px',
      borderRadius: 4,
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      fontSize: 11,
      lineHeight: '14px',
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
    },
    toggleMapBtn: {
      padding: '3px 10px',
      fontSize: 12,
      borderRadius: 6,
      border: '1px solid #4B5563',
      background: '#374151',
      color: '#F9FAFB',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      marginRight: 6
    }
  }
}
