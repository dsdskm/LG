import { SimpleRobotInfo, TaskFlow } from '@/types/taskflow'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactDOM from 'react-dom'
import { DeployMode } from '../hooks/useDeploy'

export interface DeployTaskFlow {
  name: string
  id: number
  version: number
}

export interface DeployRequestParam {
  orgInfo: string[]
  taskFlowId: number
  robotList: SimpleRobotInfo[]
}

interface DeployModalProps {
  title: string
  desc: string
  subDesc?: string
  mode: DeployMode
  status: 'READY' | 'WORKING' | 'SUCCESS' | 'FAILURE'
  onClose?: () => void
  onDeploy?: () => void
}

const DeployModal = ({ title, desc, subDesc, mode, status, onClose, onDeploy }: DeployModalProps) => {
  const { t } = useTranslation(['tms', 'common'])
  // 생성된 모달 컨테이너를 저장할 상태
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const isWorking = status === 'WORKING'
  const deployDisable = status === 'SUCCESS' || status === 'FAILURE'
  const closeDisable = status === 'SUCCESS' || status === 'FAILURE'
  const confirmDisable = !deployDisable

  useEffect(() => {
    // 1. 이미 기존에 만들어진 modal-root가 있는지 먼저 확인
    let modalRoot = document.getElementById('modal-root')

    // 2. 없다면 자바스크립트로 직접 <div>를 만듭니다.
    if (!modalRoot) {
      modalRoot = document.createElement('div')
      modalRoot.id = 'modal-root'
      document.body.appendChild(modalRoot) // body 바로 아래에 강제로 삽입
    }

    setContainer(modalRoot)

    // 컴포넌트가 사라질(unmount) 때, 우리가 만든 modal-root도 깨끗하게 삭제
    return () => {
      if (modalRoot && document.body.contains(modalRoot)) {
        document.body.removeChild(modalRoot)
      }
    }
  }, [])

  // 아직 컨테이너가 준비되지 않았다면 아무것도 그리지 않음
  if (!container) return null

  const renderContents = () => {
    return (
      <>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            textAlign: 'start',
            marginTop: '20px'
          }}
        >
          {desc}
        </p>
        <p
          style={{
            color: '#191b1e',
            fontSize: '12px',
            marginTop: '4px',
            textAlign: 'start'
          }}
        >
          {subDesc}
        </p>
      </>
    )
  }

  return ReactDOM.createPortal(
    <div
      className="modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
          minWidth: '400px',
          color: '#1f2937'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minHeight: 80
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', textAlign: 'start' }}>{title}</h3>
            {renderContents()}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          {onClose && !closeDisable && (
            <button
              onClick={onClose}
              disabled={isWorking}
              style={{
                backgroundColor: '#7BA5C1',
                opacity: isWorking ? 0.4 : 1,
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                cursor: isWorking ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {t('common:cancel')}
            </button>
          )}
          {onDeploy && !deployDisable && (
            <button
              onClick={onDeploy}
              disabled={isWorking}
              style={{
                backgroundColor: '#7BA5C1',
                opacity: isWorking ? 0.4 : 1,
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                cursor: isWorking ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {mode === 'DEPLOY' ? t('deploy.deploy') : t('deploy.undeploy')}
            </button>
          )}
          {onClose && !confirmDisable && (
            <button
              onClick={onClose}
              disabled={isWorking}
              style={{
                backgroundColor: '#7BA5C1',
                opacity: isWorking ? 0.4 : 1,
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                cursor: isWorking ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {t('common:confirm')}
            </button>
          )}
        </div>
      </div>
    </div>,
    container // 동적으로 찾거나 만든 container에 포탈을 뚫습니다.
  )
}

export default DeployModal
