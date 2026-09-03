import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from '@repo/ui'

/** 저장 후 다음 단계(시맨틱 POI 등록) 경로. */
const SEMANTIC_PATH = '/map/semantic'

/**
 * 맵 저장 완료 안내 모달.
 *
 * 저장 완료 판정은 두 단계다.
 *  1) save_map(gRPC) 응답 성공 = 3D 맵(PCD + trajectory) 저장 완료 → 이 모달을 띄운다.
 *  2) 2D 격자맵(grid_map.yaml/.png)은 lio_node 가 응답 후 비동기로 저장하므로 파일 확인이 따로 필요하다
 *     (mapApis.waitForGridMap) — 그 결과를 gridMapState 로 받아 본문에 함께 보여준다.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} props.mapName 저장된 맵 이름
 * @param {'checking'|'ready'|'pending'|'unknown'} [props.gridMapState] 2D 격자맵 확인 상태
 *   checking: 확인 중 / ready: 파일 확인됨 / pending: 대기 시간 안에 안 생김 / unknown: 확인 불가
 * @param {Function} props.onClose 닫기 핸들러
 */
const MapSaveCompleteModal = ({ isOpen, mapName, gridMapState = 'checking', onClose }) => {
  const navigate = useNavigate()
  const { t } = useTranslation('map')

  const GRID_MESSAGE = {
    checking: t('saveComplete.gridChecking'),
    ready: t('saveComplete.gridReady'),
    pending: t('saveComplete.gridPending'),
    unknown: t('saveComplete.gridUnknown')
  }

  // 격자맵 확인 중에는 화면 이동만 막는다.
  //
  // 이동하면 ConnectionBar 가 언마운트되어 폴링 결과를 못 받고(aliveRef), 맵 레코드 등록도 등록
  // 실패 시의 폴더 폐기도 실행되지 않는다 — 저장 폴더만 남고 시맨틱 화면은 그 구역 맵을 못 찾는다.
  // 확인은 최대 20초에서 끝난다(mapApis.waitForGridMap) — ready/pending/unknown 중 무엇이 되든 풀린다.
  //
  // 닫기는 막지 않는다 — 모달을 닫아도 폴링과 등록은 그대로 진행되고 결과는 토스트로 온다. 확인 중
  // 다시 저장하는 것만 문제인데, 그건 툴바의 저장 버튼에서 막는다(ConnectionBar).
  const isChecking = gridMapState === 'checking'

  // Modal 의 footer 는 renderButtonComponent.props.children.length 로 버튼 폭을 계산한다.
  // 조건부 렌더가 섞이면 개수가 틀어지므로 실제 버튼만 배열로 넘긴다.
  const buttons = [
    <Button key="close" size="lg" theme="secondary" onClick={onClose}>
      {t('saveComplete.close')}
    </Button>,
    <Button
      key="semantic"
      size="lg"
      disabled={isChecking}
      onClick={() => {
        navigate(SEMANTIC_PATH)
        onClose()
      }}
    >
      {t('saveComplete.goSemantic')}
    </Button>
  ]

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title={t('saveComplete.title')}
      onClose={onClose}
      renderButtonComponent={<>{buttons}</>}
    >
      {/* 본문 레이아웃은 SetupOrderModal 과 같은 형태로 맞춘다 (가운데 정렬 + 최소 높이) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '8rem',
          lineHeight: 1.5,
          width: '100%'
        }}
      >
        <div>{t('saveComplete.description', { name: mapName })}</div>
        <div style={{ color: 'var(--color-neutral-60)' }}>{GRID_MESSAGE[gridMapState]}</div>
      </div>
    </Modal>
  )
}

export default MapSaveCompleteModal
