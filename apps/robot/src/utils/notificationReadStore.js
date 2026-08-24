// 알림 읽음 상태를 로컬스토리지에 저장 (백엔드에 읽음 처리 API가 아직 없음)
// 고유 ID = deviceId + occurredAt 조합 (동일하면 같은 알림으로 간주)
// 같은 브라우저를 여러 계정이 사용할 수 있으므로 userId별로 키를 분리해서 관리
const READ_IDS_KEY_PREFIX = 'robot-notification-read-ids'
const MAX_STORED_IDS = 1000

function getStorageKey(userId) {
  return `${READ_IDS_KEY_PREFIX}:${userId ?? 'anonymous'}`
}

export function makeNotificationId(deviceId, occurredAt) {
  return `${deviceId}::${occurredAt}`
}

export function getReadIds(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function saveReadIds(userId, idSet) {
  const ids = Array.from(idSet)
  const trimmed = ids.length > MAX_STORED_IDS ? ids.slice(ids.length - MAX_STORED_IDS) : ids
  localStorage.setItem(getStorageKey(userId), JSON.stringify(trimmed))
}
