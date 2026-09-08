import { useTranslation } from 'react-i18next'
import { Button, Modal } from '@repo/ui'
import { ModalBody, NamePreview, PreviewLabel, PreviewValue } from './styles'

/**
 * 맵 저장 위치 선택 모달.
 *
 * 맵 스캔 화면은 위치 선택 바(LocationBar)를 상시 노출하지 않는다 — 매핑 중에 위치를 바꿀 일이
 * 없고, 저장하는 순간에만 "어디를 그린 맵인지" 정하면 되기 때문이다. 그래서 선택 UI 는
 * 저장 버튼을 눌렀을 때 이 모달로만 나타난다.
 *
 * 선택 UI 자체(Building/Floor/Area 드롭다운)는 목록 조회를 들고 있는 페이지가 children 으로
 * 넘긴다 — 이 모달과 ConnectionBar 는 위치 계층 조회를 모른다.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {React.ReactNode} props.children 위치 선택 UI (pages/Map 의 LocationBar)
 * @param {string} props.mapName 현재 선택으로 만들어질 맵 이름 ([Building]_[Floor]_[Area]).
 *   저장 폴더 이름은 난수라 미리 보여줄 값이 아니다 — 사용자가 확인할 것은 이 표시용 이름이다.
 * @param {boolean} [props.busy] 저장 요청 진행 중
 * @param {Function} props.onConfirm 저장 실행 핸들러
 * @param {Function} props.onClose 닫기 핸들러
 */
const MapSaveLocationModal = ({ isOpen, children, mapName = '', busy = false, onConfirm, onClose }) => {
  const { t } = useTranslation('map')
  const canSave = Boolean(mapName) && !busy

  // Modal 의 footer 는 renderButtonComponent.props.children.length 로 버튼 폭을 계산한다.
  // 조건부 렌더가 섞이면 개수가 틀어지므로 실제 버튼만 배열로 넘긴다.
  const buttons = [
    <Button key="cancel" size="lg" theme="secondary" onClick={onClose}>
      {t('saveLocation.cancel')}
    </Button>,
    <Button
      key="save"
      size="lg"
      onClick={onConfirm}
      disabled={!canSave}
      title={canSave ? undefined : t('saveLocation.selectAll')}
    >
      {t('saveLocation.save')}
    </Button>
  ]

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      title={t('saveLocation.title')}
      closeButton
      onClose={onClose}
      renderButtonComponent={<>{buttons}</>}
    >
      <ModalBody>
        <div>{t('saveLocation.description')}</div>

        {/* Building > Floor > Area 드롭다운 */}
        {children}

        {/* 확정될 맵 이름 미리보기 — 선택이 덜 끝나면 안내 문구를 대신 보여준다. */}
        <NamePreview>
          <PreviewLabel>{t('saveLocation.nameLabel')}</PreviewLabel>
          <PreviewValue>{mapName || t('saveLocation.selectAll')}</PreviewValue>
        </NamePreview>
      </ModalBody>
    </Modal>
  )
}

export default MapSaveLocationModal
