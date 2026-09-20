import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import frTranslation from './locales/fr.json';
import enTranslation from './locales/en.json';
import nlTranslation from './locales/nl.json';
import koTranslation from './locales/ko.json';
import zhTranslation from './locales/zh.json';

const resources = {
  fr: frTranslation,
  en: enTranslation,
  nl: nlTranslation,
  ko: koTranslation,
  zh: zhTranslation,
};

i18n
  .use(LanguageDetector) // Détecte automatiquement la langue du navigateur
  .use(initReactI18next) // Lie i18next à React
  .init({
    resources,
    fallbackLng: 'fr', // Langue par défaut si la détection échoue
    interpolation: {
      escapeValue: false, // React protège déjà contre les attaques XSS
    },
  });

export default i18n;