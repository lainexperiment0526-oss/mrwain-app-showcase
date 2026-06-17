import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  getLanguageDir,
} from './languages';

import en from './locales/en.json';
import tl from './locales/tl.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import ru from './locales/ru.json';

// Register a locale here when adding a new language (also add it to ./languages.ts).
export const resources = {
  en: { translation: en },
  tl: { translation: tl },
  es: { translation: es },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ar: { translation: ar },
  hi: { translation: hi },
  ru: { translation: ru },
} as const;

const LANGUAGE_STORAGE_KEY = 'openapp_language';

/** Keep the <html> lang/dir attributes in sync with the active language. */
function applyDocumentLanguage(lng: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = getLanguageDir(lng);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // English is the guaranteed fallback when a language (or key) is missing.
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    // Treat e.g. "en-US" as "en".
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Saved preference first, then the browser/OS language on first visit.
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

applyDocumentLanguage(i18n.language || DEFAULT_LANGUAGE);
i18n.on('languageChanged', applyDocumentLanguage);

export { LANGUAGE_STORAGE_KEY };
export default i18n;
