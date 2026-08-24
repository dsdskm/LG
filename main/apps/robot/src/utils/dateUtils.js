export function toYmdHmKST(isoString) {
  const d = new Date(isoString)
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = fmt.formatToParts(d).reduce((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})

  const yyyy = parts.year
  const MM = parts.month
  const dd = parts.day
  const HH = parts.hour
  const mm = parts.minute

  return `${yyyy}.${MM}.${dd} ${HH}:${mm}`
}

/**
 * isoString과 now의 차이를 상대 시간 단위로 변환
 * @returns {{ unit: 'justNow'|'minutesAgo'|'hoursAgo'|'daysAgo', count: number }}
 */
export function getRelativeTimeParts(isoString, now = new Date()) {
  const diffMs = now.getTime() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return { unit: 'justNow', count: 0 }
  if (diffMin < 60) return { unit: 'minutesAgo', count: diffMin }
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return { unit: 'hoursAgo', count: diffHour }
  return { unit: 'daysAgo', count: Math.floor(diffHour / 24) }
}

export function toUtcFromLocalDateTime(ymd, time = '00:00:00') {
  const date = new Date(`${ymd}T${time}`)
  return date.toISOString()
}

/**
 * ROS header.stamp {sec, nsec} → 'HH:MM:SS' (KST)
 */
export function rosStampToKstHms(stamp) {
  if (!stamp || typeof stamp.sec !== 'number') return '-'
  const ms = stamp.sec * 1000 + Math.floor((stamp.nsec || 0) / 1e6)
  return new Date(ms).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * ROS stamp → 'HH:MM:SS.mmm' (KST)
 */
export function rosStampToKstHmsMs(stamp) {
  if (!stamp || typeof stamp.sec !== 'number') return '-'
  const msAll = stamp.sec * 1000 + Math.floor((stamp.nsec || 0) / 1e6)
  const d = new Date(msAll)

  const hms = d.toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const ms = String(Math.floor((stamp.nsec || 0) / 1e6)).padStart(3, '0')
  return `${hms}.${ms}`
}
/**
 * 상대초(tSec, 로그 시작 기준) + timeRange → 'HH:MM:SS' (KST, 절대시각)
 * - 기준은 timeRange.absStartSec(절대 epoch초). 없으면 startSec로 폴백.
 * - 기준을 알 수 없으면 '--:--:--' 반환(상대시간으로 폴백할지는 호출부에서 판단).
 */
export function tSecToKstHms(tSec, timeRange) {
  const base = Number(timeRange?.absStartSec ?? timeRange?.startSec)
  if (typeof tSec !== 'number' || !Number.isFinite(base)) return '--:--:--'
  const ms = (base + tSec) * 1000
  return new Date(ms).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
