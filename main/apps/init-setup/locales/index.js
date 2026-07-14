import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'

import koMap from './ko-KR/map.json'
import enMap from './en-US/map.json'
import jaMap from './ja-JP/map.json'

import koLogin from './ko-KR/login.json'
import enLogin from './en-US/login.json'
import jaLogin from './ja-JP/login.json'

export const translations = {
  'ko-KR': {
    route: koRoute,
    map: koMap,
    login: koLogin
  },
  'en-US': {
    route: enRoute,
    map: enMap,
    login: enLogin
  },
  'ja-JP': {
    route: jaRoute,
    map: jaMap,
    login: jaLogin
  }
}
