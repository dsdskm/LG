import { useTranslation } from 'react-i18next'
import { Button, Modal } from '@repo/ui'

/**
 * 작업본 맵 덮어쓰기 확인 모달.
 *
 * 저장하려는 구역에 이미 작업 중인 맵(_working 폴더 + inactive 레코드)이 있으면 그 폴더에 다시
 * 저장한다(components/ConnectionBar resolveSaveTarget) — 이전 스캔 결과가 사라지므로 묻고 진행한다.
 * 확정된 맵(업로드로 승격된 맵)은 재사용 대상이 아니라 이 모달이 뜨지 않는다.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} [props.mapName] 덮어쓸 작업본의 표시 이름(맵 레코드 name.default)
 * @param {string} [props.dirName] 덮어쓸 저장 폴더 이름 — 어느 폴더가 바뀌는지 확인할 수 있게 보여준다
 * @param {boolean} [props.busy] 저장 요청 진행 중
 * @param {Function} props.onConfirm 덮어쓰고 저장
 * @param {Function} props.onClose 취소(저장하지 않음)
 */
const MapOverwriteModal = ({ isOpen, mapName = '', dirName = '', busy = false, onConfirm, onClose }) => {
  const { t } = useTranslation('map')

  // Modal 의 footer 는 renderButtonComponent.props.children.length 로 버튼 폭을 계산한다.
  // 조건부 렌더가 섞이면 개수가 틀어지므로 실제 버튼만 배열로 넘긴다.
  const buttons = [
    <Button key="cancel" size="lg" theme="secondary" onClick={onClose} disabled={busy}>
      {t('overwriteMap.cancel')}
    </Button>,
    <Button key="confirm" size="lg" theme="delete" onClick={onConfirm} disabled={busy}>
      {t('overwriteMap.confirm')}
    </Button>
  ]

  return (
    <Modal
      isOpen={isOpen}
      size="sm"
      title={t('overwriteMap.title')}
      closeButton
      onClose={onClose}
      renderButtonComponent={<>{buttons}</>}
    >
      <div style={styles.body}>
        <div>{t('overwriteMap.description', { name: mapName || dirName })}</div>
        {/* 기준 맵이 새로 그려지므로 그 맵에 달린 POI 도 함께 지워진다 — 되돌릴 수 없어 미리 알린다. */}
        <div style={styles.warning}>{t('overwriteMap.poiWarning')}</div>
        {dirName && <div style={styles.target}>{dirName}</div>}
      </div>
    </Modal>
  )
}

const styles = {
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    lineHeight: 1.5,
    width: '100%'
  },
  warning: {
    fontSize: 'var(--font-size-body-5)',
    color: 'var(--color-error-60)',
    fontWeight: 700
  },
  target: {
    fontSize: 'var(--font-size-body-5)',
    color: 'var(--color-neutral-60)',
    wordBreak: 'break-all'
  }
}

export default MapOverwriteModal
