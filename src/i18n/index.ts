// i18n configuration and utilities
import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';

export const languages = {
  fr: 'Français',
  en: 'English',
};

export const defaultLang = 'fr';

export const translations = {
  fr: frTranslations,
  en: enTranslations,
};

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as keyof typeof languages;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof languages) {
  return function t(key: string) {
    const keys = key.split('.');
    let value: any = translations[lang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
}