import { useEffect, useMemo, useRef, useState } from "react";

const EMPTY_OPTION = { id: "__empty__", label: "파일 없음" };

export function useLogPlayLogic({ initialDate }) {
  const [logOptions, setLogOptions] = useState([EMPTY_OPTION]);

  const mapOptions = useMemo(
    () => [
      { id: "map-f1", label: "Factory 1층" },
      { id: "map-f2", label: "Factory 2층" },
      { id: "map-lab", label: "Lab 구역" },
    ],
    []
  );

  // ----------------------------
  // 상태값
  // ----------------------------
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (로컬 기준 ISO 문자열에서 앞부분 사용)
  const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);

  //드롭다운 제어를 위해 항상 문자열 ID 유지
  const [selectedLogId, setSelectedLogId] = useState(EMPTY_OPTION.id);
  const [selectedMapId, setSelectedMapId] = useState(mapOptions[0]?.id || "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [settingsValue, setSettings] = useState({
    showPath: true,
    showVelocityVector: false,
    showObstacles: false,
    showSensorPoints: false,
  });

  const settings = useMemo(
    () => ({
      value: settingsValue,
      set: setSettings,
    }),
    [settingsValue]
  );

  const dateInputRef = useRef(null);
  const settingsHoverTimer = useRef(null);

  const [logLines, setLogLines] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logError, setLogError] = useState(null);

  // 레벨 필터 상태
  const [levelFilter, setLevelFilter] = useState({
    INFO: true,
    WARN: true,
    ERROR: true,
    DEBUG: false,
  });

  // 키워드 검색
  const [pendingKeyword, setPendingKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  // 본문 영역(맵/로그) 세로 분할: 드래그로 높이 조절
  const [topRatio, setTopRatio] = useState(60);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // presigned URL 캐시
  const presignedCacheRef = useRef(new Map()); // fileId -> { url, expiresAt }

  // ----------------------------
  // 재생 타이머 (데모)
  // ----------------------------
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlayIndex((prev) => (prev + 1) % 500);
      }, 200);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  function formatDate(yyyyMMdd) {
    if (!yyyyMMdd) return "";
    const [y, m, d] = yyyyMMdd.split("-");
    return `${y}.${m}.${d}`;
  }

  const onLogChange = (value) => setSelectedLogId(value);

  function detectLevel(line) {
    if (!line) return "UNKNOWN";
    const p1 = line.match(/\[\s*(INFO|WARN|ERROR|DEBUG)\s*\]/);
    if (p1) return p1[1];
    const p2 = line.match(/\]\s*(INFO|WARN|ERROR|DEBUG)\b/);
    if (p2) return p2[1];
    const p3 = line.match(/\b(INFO|WARN|ERROR|DEBUG)\b/);
    if (p3) return p3[1];
    return "UNKNOWN";
  }

  const activeLevels = useMemo(
    () => Object.entries(levelFilter).filter(([, v]) => v).map(([k]) => k),
    [levelFilter]
  );

  const filteredLines = useMemo(() => {
    if (!Array.isArray(logLines) || logLines.length === 0) return [];
    const hasKeyword = appliedKeyword.trim().length > 0;
    const kw = appliedKeyword.trim().toLowerCase();

    return logLines.filter((raw) => {
      const line = String(raw);
      const lvl = detectLevel(line);
      if (!activeLevels.includes(lvl)) return false;
      if (hasKeyword && !line.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [logLines, activeLevels, appliedKeyword]);

  const handlePrevFrame = () => {
    setIsPlaying(false);
    setPlayIndex((prev) => (prev - 1 + 500) % 500);
  };
  const handleTogglePlay = () => setIsPlaying((p) => !p);
  const handleNextFrame = () => {
    setIsPlaying(false);
    setPlayIndex((prev) => (prev + 1) % 500);
  };

  const openSettingsPopover = () => {
    if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current);
    setShowSettings(true);
  };
  const scheduleCloseSettingsPopover = () => {
    if (settingsHoverTimer.current) clearTimeout(settingsHoverTimer.current);
    settingsHoverTimer.current = setTimeout(() => {
      setShowSettings(false);
    }, 150);
  };

  const onDragStart = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", onDragging);
    document.addEventListener("mouseup", onDragEnd);
  };
  const onDragging = (e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const headerHeight =
      containerRef.current.querySelector("#headerWrap")?.getBoundingClientRect().height || 0;
    const y = e.clientY - rect.top - headerHeight;
    const contentHeight = rect.height - headerHeight;
    if (contentHeight <= 0) return;

    let ratio = (y / contentHeight) * 100;
    const minTopPx = 200;
    const minBottomPx = 120;
    const minTopRatio = (minTopPx / contentHeight) * 100;
    const maxTopRatio = 100 - (minBottomPx / contentHeight) * 100;
    ratio = Math.max(minTopRatio, Math.min(maxTopRatio, ratio));
    setTopRatio(ratio);
  };
  const onDragEnd = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", onDragging);
    document.removeEventListener("mouseup", onDragEnd);
  };

  const toggleLevel = (lv) =>
    setLevelFilter((f) => ({
      ...f,
      [lv]: !f[lv],
    }));

  return {
    // 데이터/상태
    logOptions,
    mapOptions,
    selectedDate,
    selectedLogId,
    selectedMapId,
    isPlaying,
    playIndex,
    showSettings,
    settings,
    dateInputRef,
    logLines,
    isLoadingLogs,
    logError,
    levelFilter,
    pendingKeyword,
    appliedKeyword,
    topRatio,
    containerRef,
    filteredLines,

    // 유틸
    formatDate,
    detectLevel,

    // 핸들러
    openSettingsPopover,
    scheduleCloseSettingsPopover,
    handlePrevFrame,
    handleTogglePlay,
    handleNextFrame,
    toggleLevel,
    onDragStart,
    onLogChange,
    setPendingKeyword,
  };
}
``