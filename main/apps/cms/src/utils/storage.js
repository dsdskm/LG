// CMS 브라우저 설정(localStorage) 통합 저장소.
// 단일 root 키(cms.prefs) 아래 JSON 객체로 저장하고, 내부 분류 키(STORAGE_KEYS)로 항목을 구분한다.
// 전체 객체를 JSON 직렬화하므로 number/array/string 등 네이티브 타입을 그대로 저장/복원한다.
const ROOT_KEY = 'cms.prefs'

// 내부 분류 키
export const STORAGE_KEYS = {
  CONTENT_FILTER_SERVICE: 'content.filterService',
  CONTENT_FILTER_CATEGORIES: 'content.filterCategories',
  CONTENT_ITEMS_PER_PAGE: 'content.itemsPerPage',
  TTS_LANGUAGE_ID: 'tts.languageId',
  TTS_VOICE_CODE: 'tts.voiceCode',
}

const readAll = () => {
  try {
    const obj = JSON.parse(localStorage.getItem(ROOT_KEY) || '{}')
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

const writeAll = (obj) => {
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(obj))
  } catch {
    /* ignore quota/serialization errors */
  }
}

export const getPref = (key, fallback = null) => {
  const all = readAll()
  return key in all ? all[key] : fallback
}

export const setPref = (key, value) => {
  const all = readAll()
  all[key] = value
  writeAll(all)
}

export const removePref = (key) => {
  const all = readAll()
  if (key in all) {
    delete all[key]
    writeAll(all)
  }
}
