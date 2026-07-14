import koEbme from './ko-KR/ebme.json'
import enEbme from './en-US/ebme.json'
import jaEbme from './ja-JP/ebme.json'
import korobot from './ko-KR/robot.json'
import enrobot from './en-US/robot.json'
import jarobot from './ja-JP/robot.json'
import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'

export const translations = {
  'ko-KR': { ebme: koEbme, robot: korobot, route: koRoute },
  'en-US': { ebme: enEbme, robot: enrobot, route: enRoute },
  'ja-JP': { ebme: jaEbme, robot: jarobot, route: jaRoute }
}
