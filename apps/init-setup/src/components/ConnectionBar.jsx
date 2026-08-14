import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from '@repo/ui'
import { startMapping, createMapping, resetMapping, cancelMapping, waitForGridMap } from '@/apis/mapApis'
import { toast } from 'react-toastify'
import MapSaveCompleteModal from '@/components/MapSaveCompleteModal'

const StyledSlider = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 6px;
  background: ${({ $percentage }) =>
    `linear-gradient(to right, #2980b9 0%, #2980b9 ${$percentage}%, #dee2e6 ${$percentage}%, #dee2e6 100%)`};
  border-radius: 3px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2980b9;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.1s ease,
      background-color 0.1s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    background: #2471a3;
  }

  &::-moz-range-track {
    background: #dee2e6;
    height: 6px;
    border-radius: 3px;
  }

  &::-moz-range-progress {
    background-color: #2980b9;
    height: 6px;
    border-radius: 3px 0 0 3px;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2980b9;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.1s ease,
      background-color 0.1s ease;
    cursor: pointer;
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.15);
    background: #2471a3;
  }
`

/**
 * ConnectionBar
 *
 * WebSocket URL 입력 + 연결/해제 버튼 컴포넌트.
 * 연결 상태(status)에 따라 버튼 텍스트와 색상이 변경됨.
 *
 * 매핑 버튼의 맵 이름은 여기서 입력받지 않는다 — 위치 계층(Building/Floor/Area)에서 만든
 * mapName 과 시작 가능 여부(canStartMapping)를 부모(pages/Map)에서 props 로 받는다.
 *
 * @param {string} [mapName] 저장에 쓸 맵 이름 (Building명-Floor명-Area명 또는 'Default')
 * @param {boolean} [canStartMapping] 위치 선택이 끝나 매핑을 시작할 수 있는지
 */
export default function ConnectionBar({
  url,
  onUrlChange,
  status,
  onConnect,
  onDisconnect,
  fps,
  onFpsChange,
  mapName = '',
  canStartMapping = true,
  t
}) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const [isMapping, setIsMapping] = useState(false)
  // 저장 완료 모달 상태. savedMap 이 있으면 모달이 열린다.
  const [savedMap, setSavedMap] = useState(null)
  const [gridMapState, setGridMapState] = useState('checking')
  // grid_map 폴링이 끝나기 전에 화면을 떠날 수 있으므로 언마운트 후 setState 를 막는다.
  const aliveRef = useRef(true)
  useEffect(
    () => () => {
      aliveRef.current = false
    },
    []
  )

  // 연결 상태별 표시 텍스트와 색상
  const STATUS_CONFIG = {
    disconnected: { label: t('disconnected'), color: '#888' },
    connecting: { label: t('connecting'), color: '#f0a500' },
    connected: { label: t('connected'), color: '#27ae60' },
    error: { label: t('error'), color: '#e74c3c' }
  }
  const { label, color } = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected

  // 위치 계층을 받아온 경우에는 Building/Floor/Area 가 모두 선택돼야 매핑을 시작할 수 있다
  // (맵 이름이 곧 위치라서, 미선택 상태로 시작하면 어디를 그린 맵인지 남지 않는다).
  // 매핑 중 중복 시작은 버튼 비활성이 아니라 시작 버튼 자체를 감추는 것으로 막는다.

  // init-setup-be → robot-hub gRPC 경유라 로봇이 거부하면 4xx/5xx 로 돌아온다.
  // 실패 시 isMapping 을 되돌려야 버튼 상태가 실제 로봇 상태와 어긋나지 않는다.
  const runMappingAction = async (action, { onSuccess, onError, successMessage } = {}) => {
    try {
      const response = await action()
      onSuccess?.(response)
      toast.success(response?.data?.message || successMessage, { autoClose: 1500 })
    } catch (error) {
      onError?.()
      // init-setup-be 에러 응답 봉투: { success: false, error: { message } }
      const message = error?.response?.data?.error?.message || error?.message || 'Request failed'
      toast.error(message, { autoClose: 3000 })
    }
  }

  const handleStart = async () => {
    await runMappingAction(startMapping, {
      onSuccess: () => setIsMapping(true),
      onError: () => setIsMapping(false),
      successMessage: 'Mapping started'
    })
  }
  const handleSave = async () => {
    // save-map 바디는 { name } 만 받는다 — save_path 는 LIO_MAP_BASE_DIR 하위 강제라 FE 가 쓸 이유가 없다.
    // name 은 위치 계층에서 만든 Building명-Floor명-Area명(계층이 없으면 'Default')이다.
    // 빈 문자열은 백엔드가 400 으로 거부하므로 그 경우 키를 빼고 보낸다(맵 이름 자동 생성).
    const name = mapName.trim()
    await runMappingAction(() => createMapping(name ? { name } : {}), {
      onSuccess: (response) => {
        setIsMapping(false)
        // 저장 응답 성공 = 3D 맵(PCD + trajectory) 저장 완료 → 완료 모달을 띄운다.
        // 이름은 백엔드가 확정한 값을 쓴다(미지정 시 map_YYMMDD_HHMMSS 로 생성된다).
        const savedName = response?.data?.name || name
        setSavedMap({ name: savedName })
        setGridMapState('checking')
        // 2D 격자맵(grid_map.yaml/.png)은 lio_node 가 응답 뒤 비동기로 저장하므로 파일로 확인한다.
        waitForGridMap(savedName).then(({ state }) => {
          if (aliveRef.current) setGridMapState(state)
        })
      },
      successMessage: 'Map saved'
    })
  }
  const handleReset = async () => {
    await runMappingAction(resetMapping, { successMessage: 'Mapping reset' })
  }
  const handleCancel = async () => {
    await runMappingAction(cancelMapping, {
      onSuccess: () => setIsMapping(false),
      successMessage: 'Mapping canceled'
    })
  }

  return (
    <>
      <div style={styles.bar}>
        {/* 페이지 제목은 페이지의 Title 이 담당한다 — 툴바는 조작 요소만 갖는다. */}

        {/* WebSocket URL 입력 필드 */}
        <input
          style={styles.input}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={import.meta.env.VITE_WEBSOCKET_URL}
          disabled={isConnected || isConnecting}
        />

        {/* 연결/해제 버튼 */}
        {isConnected ? (
          <Button size="md" theme="delete" onClick={onDisconnect}>
            {t('disconnect')}
          </Button>
        ) : (
          <Button size="md" onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? t('connecting') : t('connect')}
          </Button>
        )}

        {/* 연결 상태 표시 뱃지 */}
        <span style={{ ...styles.badge, backgroundColor: color }}>{label}</span>

        {/* 업데이트 주기 (FPS) 조절 슬라이더 */}
        <div style={styles.fpsContainer}>
          <span style={styles.fpsLabel}>
            FPS : <strong>{fps} Hz</strong>
          </span>
          <StyledSlider
            type="range"
            min="1"
            max="30"
            value={fps}
            onChange={(e) => onFpsChange(Number(e.target.value))}
            $percentage={((fps - 1) / 29) * 100}
          />
        </div>

        {/* 매핑 조작부는 연결 여부와 무관하게 자리를 유지한다 — 연결 전에는 시작 버튼을
            숨기지 않고 비활성으로 보여줘서 어떤 조작이 가능한지 미리 알 수 있게 한다. */}
        <div style={styles.mappingContainer}>
          {/* 저장될 맵 이름(위치 계층에서 자동 생성). 직접 입력하지 않는다. */}
          <span style={styles.mapName} title={mapName}>
            {mapName || '-'}
          </span>
          {/* 저장 · 리셋 · 취소는 매핑이 시작된 뒤에만 의미가 있으므로 그때만 노출한다
              (매핑 전에는 비활성 버튼도 두지 않아 시작 버튼만 남는다). */}
          {isMapping ? (
            <>
              <Button size="md" onClick={handleSave}>
                {t('save')}
              </Button>
              <Button size="md" theme="tertiary" onClick={handleReset}>
                {t('reset')}
              </Button>
              <Button size="md" theme="tertiary" onClick={handleCancel}>
                {t('cancel')}
              </Button>
            </>
          ) : (
            <Button
              size="md"
              onClick={handleStart}
              disabled={!isConnected || !canStartMapping}
              title={
                (!isConnected && t('connectToStartMapping')) ||
                (!canStartMapping && t('selectLocationForMapping')) ||
                undefined
              }
            >
              {t('start')}
            </Button>
          )}
        </div>
      </div>

      {/* 저장 완료 안내 — 닫기 / 시맨틱 화면 이동 */}
      <MapSaveCompleteModal
        isOpen={Boolean(savedMap)}
        mapName={savedMap?.name}
        gridMapState={gridMapState}
        onClose={() => setSavedMap(null)}
      />
    </>
  )
}

const styles = {
  // Section(카드) 안에 놓이는 툴바다 — 배경/좌우 여백은 Section 이 이미 갖고 있어서
  // 아래쪽 구분선과 그만큼의 여백만 남긴다.
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottom: '1px solid var(--color-secondary-20)',
    flexWrap: 'wrap'
  },
  // 글꼴 크기는 공용 토큰(--font-size-body-5/6)만 쓴다 — 툴바 안에서 12/13/14px 이 섞이지 않게.
  input: {
    width: '200px',
    padding: '6px 10px',
    border: '1px solid var(--color-secondary-20)',
    borderRadius: 'var(--radius-xs)',
    fontSize: 'var(--font-size-body-5)',
    color: 'var(--color-neutral-80)'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 12,
    color: 'var(--color-neutral-10)',
    fontSize: 'var(--font-size-body-6)',
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },
  mappingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto'
  },
  mapName: {
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 'var(--font-size-body-5)',
    fontWeight: 700,
    color: 'var(--color-neutral-70)'
  },
  fpsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--color-secondary-10)',
    padding: '4px 12px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--color-secondary-20)'
  },
  fpsLabel: {
    fontSize: 'var(--font-size-body-5)',
    color: 'var(--color-neutral-70)'
  }
}
