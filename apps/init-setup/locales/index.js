import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'

import koMap from './ko-KR/map.json'
import enMap from './en-US/map.json'
import jaMap from './ja-JP/map.json'

import koSetup from './ko-KR/setup.json'
import enSetup from './en-US/setup.json'
import jaSetup from './ja-JP/setup.json'

// transfer: 맵 설정의 업로드/다운로드 페이지 (두 화면이 위치 라벨·문구를 공유한다).
import koTransfer from './ko-KR/transfer.json'
import enTransfer from './en-US/transfer.json'
import jaTransfer from './ja-JP/transfer.json'

// login 네임스페이스는 여러 앱이 공유하므로 @repo/locales로 이동했다.
export const translations = {
  'ko-KR': {
    route: koRoute,
    map: koMap,
    setup: koSetup,
    transfer: koTransfer
  },
  'en-US': {
    route: enRoute,
    map: enMap,
    setup: enSetup,
    transfer: enTransfer
  },
  'ja-JP': {
    route: jaRoute,
    map: jaMap,
    setup: jaSetup,
    transfer: jaTransfer
  }
}
