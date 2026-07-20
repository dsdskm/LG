import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'
import koLearn from './ko-KR/learn.json'
import enLearn from './en-US/learn.json'
import jaLearn from './ja-JP/learn.json'

export const translations = {
  'ko-KR': { route: koRoute, learn: koLearn },
  'en-US': { route: enRoute, learn: enLearn },
  'ja-JP': { route: jaRoute, learn: jaLearn }
}
