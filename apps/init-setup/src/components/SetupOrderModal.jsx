import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Modal } from '@repo/ui'

/**
 * 초기 설정 → 맵 설정 순서를 강제할 때 띄우는 안내 모달.
 *
 * 초기 설정이 끝나지 않은 상태에서 맵 설정으로 건너뛰려 하면(헤더 탭 클릭 또는 URL 직접 진입)
 * 남은 선행 단계를 알려주고 그 단계로 이동시킨다.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {string} props.pendingPath 이어서 진행할 초기 설정 단계 경로
 * @param {string} props.pendingLabel 그 단계의 표시 이름 (이미 번역된 값)
 * @param {Function} [props.onClose] 닫기 핸들러. 없으면 취소 버튼을 숨긴다(URL 직접 진입 시 갈 곳이 없으므로).
 */
const SetupOrderModal = ({ isOpen, pendingPath, pendingLabel, onClose }) => {
  const navigate = useNavigate()
  const { t } = useTranslation('setup')

  // Modal 의 footer 는 renderButtonComponent.props.children.length 로 버튼 폭을 계산한다.
  // 조건부 렌더(false 항목)가 섞이면 개수가 틀어지므로 실제 버튼만 배열로 넘긴다.
  const buttons = [
    ...(onClose
      ? [
          <Button key="cancel" size="lg" theme="secondary" onClick={onClose}>
            {t('orderGuard.cancel')}
          </Button>
        ]
      : []),
    <Button
      key="confirm"
      size="lg"
      onClick={() => {
        navigate(pendingPath, { replace: !onClose })
        // 탭 클릭으로 열린 경우 모달은 그대로 남으므로 이동 후 직접 닫는다.
        // (URL 직접 진입 경로는 onClose 가 없고, 이동하면 게이트 화면 자체가 사라진다)
        if (onClose) onClose()
      }}
    >
      {t('orderGuard.confirm', { step: pendingLabel })}
    </Button>
  ]

  return (
    // headerSize 는 기본값(lg)을 쓴다 — Modal 의 header padding 은 lg/md 만 값이 있고
    // 'sm' 을 넘기면 padding 이 아예 사라진다.
    <Modal
      isOpen={isOpen}
      size="sm"
      title={t('orderGuard.title')}
      onClose={onClose}
      renderButtonComponent={<>{buttons}</>}
    >
      {/* 본문 레이아웃은 공용 GlobalErrorModal 과 같은 형태로 맞춘다 (가운데 정렬 + 최소 높이) */}
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
        <div>{t('orderGuard.description')}</div>
        <div>{t('orderGuard.step', { step: pendingLabel })}</div>
      </div>
    </Modal>
  )
}

export default SetupOrderModal
