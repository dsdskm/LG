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

if (!i18n.isInitialized) {
  const resources = mergeResources(globalTranslations, localTranslations)
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: ['ko-KR', 'en-US', 'ja-JP'],
      fallbackLng: 'ko-KR',
      interpolation: { escapeValue: false },
      react: { useSuspense: false }
    })
} else {
  // Running as MFE — main app's i18n is already initialized.
  // Add the learn app's local namespace translations if not already present.
  Object.keys(localTranslations).forEach((lang) => {
    Object.keys(localTranslations[lang]).forEach((ns) => {
      if (!i18n.hasResourceBundle(lang, ns)) {
        i18n.addResourceBundle(lang, ns, localTranslations[lang][ns], true, true)
      }
    })
  })
}

export default i18n
