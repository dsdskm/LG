import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'
import koTms from './ko-KR/tms.json'
import enTms from './en-US/tms.json'
import jaTms from './ja-JP/tms.json'

export const translations = {
  'ko-KR': {
    route: koRoute,
    tms: koTms
  },
  'en-US': {
    route: enRoute,
    tms: enTms
  },
  'ja-JP': {
    route: jaRoute,
    tms: jaTms
  }
}
