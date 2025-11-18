import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { useI18nStore } from '../store/i18n.store';
import en from './locales/en.json';
import kz from './locales/kz.json';
import ru from './locales/ru.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  kz: { translation: kz },
};

const detectBrowserLanguage = (): 'ru' | 'en' | 'kz' => {
  if (typeof navigator === 'undefined') return 'ru';

  const languages = navigator.languages ? [...navigator.languages] : [];
  const browserLang = navigator.language || languages[0] || 'ru';
  const langCode = browserLang.toLowerCase().split('-')[0];

  if (langCode === 'en') return 'en';
  if (langCode === 'kk' || langCode === 'kz') return 'kz';
  return 'ru';
};

const getInitialLanguage = (): 'ru' | 'en' | 'kz' => {
  try {
    const store = useI18nStore.getState();
    if (store.language && ['ru', 'en', 'kz'].includes(store.language)) {
      return store.language;
    }
  } catch {}
  return detectBrowserLanguage();
};

const initialLanguage = getInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'ru',
    defaultNS: 'translation',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'locale',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

useI18nStore.subscribe((state) => {
  if (
    i18n.language !== state.language &&
    (state.language === 'ru' || state.language === 'en' || state.language === 'kz')
  ) {
    void i18n.changeLanguage(state.language);
  }
});

export default i18n;
