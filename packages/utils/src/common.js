export const getRandomId = () => {
  return Math.random().toString(36).substr(2, 16)
}

// Helper to get the first segment of a path (the app identifier)
export const getAppPrefix = (p) => {
  if (!p || p === '/' || p === '') return '/'
  const parts = p.split('/')
  const prefixSegment = parts[1] ? `/${parts[1]}` : '/'
  // Remove trailing slash for comparison consistency
  return prefixSegment !== '/' && prefixSegment.endsWith('/') ? prefixSegment.slice(0, -1) : prefixSegment
}

export const convertDateToString = (date) => {
  const d = new Date(date)
  const pad = (n) => n.toString().padStart(2, '0')
  const result = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return result
}

export const convertDateToYYYYMMDD = (date) => {
  const d = new Date(date)
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const getTimestampSec = () => Math.floor(Date.now() / 1000)

/**
 * 36자(UUID v4) 랜덤 문자열 생성
 * 예: d8134b2f-76cc-4200-8eb0-cfef45a226a3
 * @returns {string} UUID v4 (36 chars)
 */
export const generateUuid36 = () => {
  // 최신 브라우저/런타임에서는 가장 간단 & 표준
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID() // RFC 4122 v4
  }

  // Fallback: crypto.getRandomValues 기반 UUID v4 생성
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)

    // UUID v4 규격 세팅: version(0100), variant(10xx)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10

    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
    return (
      hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
    )
  }

  // 최후의 fallback (보안 강도 낮음): 런타임에 crypto가 없을 때만
  // 가능하면 위 crypto 경로를 쓰는 것을 추천
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1)
  // v4 형태 맞추기
  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    '4' +
    s4().slice(1) +
    '-' +
    ((8 + Math.random() * 4) | 0).toString(16) +
    s4().slice(1) +
    '-' +
    s4() +
    s4() +
    s4()
  ).toLowerCase()
}

/**
 * 조직 데이터를 표준 포맷으로 변환
 * @param {Object} org 원본 데이터
 * @param {string} type 데이터 유형 ('GROUP', 'SITE', 'ORGANIZATION')
 * @param {string|number} parent 최상위 부모 데이터 (GROUP인 경우 사용)
 * @returns {Object} 표준 포맷 데이터
 */
export const standardizeOrganization = (org, type = 'ORGANIZATION', parent = null) => {
  if (type === 'GROUP') {
    return {
      code: org.groupId,
      displayName: org.groupName,
      parentCode: null,
      parentDisplayName: '',
      originalType: type,
      originalData: org
    }
  } else if (type === 'SITE') {
    return {
      code: org.siteId,
      displayName: org.siteName,
      parentCode: parent?.code || null,
      parentDisplayName: parent?.displayName || '',
      originalType: type,
      originalData: org
    }
  } else if (type === 'COMPANY') {
    return {
      id: org.id || parent?.id,
      code: 'default',
      displayName: org.displayName || 'Company',
      parentCode: null,
      parendtDisplayName: '',
      originalType: 'COMPANY'
    }
  } else if (type === 'CMS_GROUP') {
    return {
      id: org.groupId,
      code: org.groupCode,
      displayName: org.groupDisplayName,
      parentCode: null,
      parentDisplayName: '',
      originalType: type
    }
  } else if (type === 'CMS_SITE') {
    return {
      id: org.siteId,
      code: org.siteCode,
      parentCode: org.groupCode,
      parentDisplayName: org.groupDisplayName || '',
      displayName: org.siteDisplayName,
      originalType: type
    }
  } else {
    // Default OTA ORGANIZATION
    return {
      id: org.id,
      code: org.code,
      displayName: org.displayName,
      parentCode: parent === null ? undefined : parent?.code,
      parentDisplayName: parent?.displayName || '',
      roleName: org.roleName || '',
      originalType: 'ORGANIZATION',
      originalData: org
    }
  }
}
