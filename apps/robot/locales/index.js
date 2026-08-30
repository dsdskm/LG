import koRobot from './src/ko-KR/robot.json'
import enRobot from './src/en-US/robot.json'
import jaRobot from './src/ja-JP/robot.json'
import koRoute from './src/ko-KR/route.json'
import enRoute from './src/en-US/route.json'
import jaRoute from './src/ja-JP/route.json'

export const translations = {
  'ko-KR': { robot: koRobot, route: koRoute },
  'en-US': { robot: enRobot, route: enRoute },
  'ja-JP': { robot: jaRobot, route: jaRoute }
}
