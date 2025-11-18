import { create } from 'zustand';
import { devtools, type PersistStorage, persist } from 'zustand/middleware';

export type Language = 'ru' | 'en' | 'kz';

interface I18nStore {
  language: Language;
  setLanguage: (language: Language) => void;
}

const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'ru';

  const languages = navigator.languages ? [...navigator.languages] : [];
  const browserLang = navigator.language || languages[0] || 'ru';
  const langCode = browserLang.toLowerCase().split('-')[0];

  if (langCode === 'en') return 'en';
  if (langCode === 'kk' || langCode === 'kz') return 'kz';
  return 'ru';
};

const getInitialLanguage = (): Language => {
  if (typeof localStorage === 'undefined') return detectBrowserLanguage();

  const localeValue = localStorage.getItem('locale');
  if (localeValue === 'ru' || localeValue === 'en' || localeValue === 'kz') {
    return localeValue;
  }

  if (localStorage.getItem('language-storage')) {
    localStorage.removeItem('language-storage');
  }

  return detectBrowserLanguage();
};

export const useI18nStore = create<I18nStore>()(
  devtools(
    persist(
      (set) => ({
        language: getInitialLanguage(),
        setLanguage: (language) => {
          localStorage.setItem('locale', language);
          set({ language }, false, 'setLanguage');
        },
      }),
      {
        name: 'locale',
        partialize: (state): Pick<I18nStore, 'language'> => ({ language: state.language }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            localStorage.setItem('locale', state.language);
          }
        },
        storage: {
          getItem: (name: string) => {
            const value = localStorage.getItem(name);
            if (value === 'ru' || value === 'en' || value === 'kz') {
              return JSON.stringify({ state: { language: value } });
            }
            return null;
          },
          setItem: (name: string, value: string) => {
            try {
              const parsed = JSON.parse(value);
              if (parsed && typeof parsed === 'object' && parsed.state) {
                const language = parsed.state.language;
                if (language === 'ru' || language === 'en' || language === 'kz') {
                  localStorage.setItem(name, language);
                }
              }
            } catch {}
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name);
          },
        } as unknown as PersistStorage<Pick<I18nStore, 'language'>>,
      }
    ),
    { name: 'I18nStore' }
  )
);
