import koCommon from './src/ko-KR/common.json'
import enCommon from './src/en-US/common.json'
import jaCommon from './src/ja-JP/common.json'
import koLayout from './src/ko-KR/layout.json'
import enLayout from './src/en-US/layout.json'
import jaLayout from './src/ja-JP/layout.json'

export const translations = {
  'ko-KR': { common: koCommon, layout: koLayout },
  'en-US': { common: enCommon, layout: enLayout },
  'ja-JP': { common: jaCommon, layout: jaLayout }
}
