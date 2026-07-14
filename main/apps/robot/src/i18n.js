import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { translations as globalTranslations } from '@repo/locales'
import { translations as localTranslations } from '../locales'

const i18n = i18next.default || i18next

const mergeResources = (global, local) => {
  const merged = { ...global }
  Object.keys(local).forEach((lang) => {
    merged[lang] = { ...merged[lang], ...local[lang] }
  })
  return merged
}

const resources = mergeResources(globalTranslations, localTranslations)

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: ['ko-KR', 'en-US', 'ja-JP'],
      fallbackLng: 'ko-KR',
      interpolation: {
        escapeValue: false
      },
      react: {
        useSuspense: false
      }
    })
}

export default i18n
