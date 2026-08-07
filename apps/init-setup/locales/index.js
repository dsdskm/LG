import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'

import koMap from './ko-KR/map.json'
import enMap from './en-US/map.json'
import jaMap from './ja-JP/map.json'

// login 네임스페이스는 여러 앱이 공유하므로 @repo/locales로 이동했다.
export const translations = {
  'ko-KR': {
    route: koRoute,
    map: koMap
  },
  'en-US': {
    route: enRoute,
    map: enMap
  },
  'ja-JP': {
    route: jaRoute,
    map: jaMap
  }
}
