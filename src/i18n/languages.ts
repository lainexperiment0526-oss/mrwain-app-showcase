// Central registry of supported languages.
// Adding a new language is a two-step process:
//   1. Add an entry here.
//   2. Add the matching locale JSON in ./locales and register it in ./index.ts.
// Nothing else in the UI is hardcoded to a specific language.

export interface LanguageMeta {
  /** BCP-47 language code used by i18next */
  code: string;
  /** English name of the language */
  name: string;
  /** Native name shown in the language selector */
  nativeName: string;
  /** Text direction, defaults to 'ltr' */
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

export const DEFAULT_LANGUAGE = 'en';

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export function getLanguageMeta(code: string): LanguageMeta | undefined {
  const base = code.split('-')[0];
  return SUPPORTED_LANGUAGES.find((l) => l.code === code || l.code === base);
}

export function getLanguageDir(code: string): 'ltr' | 'rtl' {
  return getLanguageMeta(code)?.dir ?? 'ltr';
}
