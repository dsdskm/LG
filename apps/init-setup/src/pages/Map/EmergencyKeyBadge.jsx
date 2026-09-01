import { EMERGENCY_KEY_LOCKED, EMERGENCY_KEY_RELEASED } from '@/utils/emergencyKey'
import { MappingStatusBadge } from './styles'

/**
 * EmergencyKeyBadge
 *
 * 비상정지 버튼(하드웨어 키) 상태 배지 — /emergency_key_status.
 * 맵 스캔 화면과 시맨틱 화면이 같은 자리(상태 배지 줄)에 같은 모양으로 띄우므로 여기로 모았다.
 *
 * 눌려 있는 동안($alert)만 경고색이다. 수신이 없거나 끊긴 상태(unknown)는 회색 '수신 대기 중' 으로
 * 두고 조작도 막지 않는다 — power-on-micom 이 없는 구성에서 화면이 잠기면 안 된다
 * (판정 근거는 @/utils/emergencyKey 주석 참고).
 *
 * @param {{state: string}} emergency useEmergencyKey() 결과
 * @param {(key: string) => string} t map 네임스페이스 번역 함수
 */
export default function EmergencyKeyBadge({ emergency, t }) {
  const LABELS = {
    [EMERGENCY_KEY_LOCKED]: t('emergencyKeyLocked'),
    [EMERGENCY_KEY_RELEASED]: t('emergencyKeyReleased')
  }

  return (
    <MappingStatusBadge $alert={emergency.state === EMERGENCY_KEY_LOCKED}>
      <span className="label typographyBody5">{t('emergencyKey')}</span>
      <strong className="value typographyBody5">{LABELS[emergency.state] ?? t('waitingForData')}</strong>
    </MappingStatusBadge>
  )
}
