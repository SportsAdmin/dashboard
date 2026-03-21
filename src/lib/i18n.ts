import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esTranslation from '@/locales/es/translation.json'
import enTranslation from '@/locales/en/translation.json'

const resources = {
  es: {
    translation: esTranslation,
  },
  en: {
    translation: enTranslation,
  },
}

// Get saved language from localStorage or default to Spanish
const savedLanguage = localStorage.getItem('language') || 'es'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  })

export default i18n
