import koCommon from './src/ko-KR/common.json'
import enCommon from './src/en-US/common.json'
import jaCommon from './src/ja-JP/common.json'
import koLayout from './src/ko-KR/layout.json'
import enLayout from './src/en-US/layout.json'
import jaLayout from './src/ja-JP/layout.json'
import koLogin from './src/ko-KR/login.json'
import enLogin from './src/en-US/login.json'
import jaLogin from './src/ja-JP/login.json'
import koSemantic from './src/ko-KR/semantic.json'
import enSemantic from './src/en-US/semantic.json'
import jaSemantic from './src/ja-JP/semantic.json'

export const translations = {
  'ko-KR': { common: koCommon, layout: koLayout, login: koLogin, semantic: koSemantic },
  'en-US': { common: enCommon, layout: enLayout, login: enLogin, semantic: enSemantic },
  'ja-JP': { common: jaCommon, layout: jaLayout, login: jaLogin, semantic: jaSemantic }
}
