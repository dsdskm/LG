import { lazy } from 'react'

const SvgLanguageKr = lazy(() => import('../../../assets/svgs/languages_kr.svg'))
const SvgLanguageUs = lazy(() => import('../../../assets/svgs/languages_us.svg'))
const SvgLanguageJp = lazy(() => import('../../../assets/svgs/languages_jp.svg'))

const languageOptions = [
  {
    key: 'ko-KR',
    name: '한국어',
    icon: SvgLanguageKr
  },
  {
    key: 'en-US',
    name: 'English',
    icon: SvgLanguageUs
  },
  {
    key: 'ja-JP',
    name: '日本語',
    icon: SvgLanguageJp
  }
]

export default languageOptions
