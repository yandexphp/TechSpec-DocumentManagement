import { create } from 'zustand';
import { devtools, type PersistStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

const getInitialTheme = (): Theme => {
  if (typeof localStorage === 'undefined') return 'light';

  const themeValue = localStorage.getItem('theme');
  if (themeValue === 'light' || themeValue === 'dark') {
    return themeValue;
  }

  return 'light';
};

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        theme: getInitialTheme(),
        toggleTheme: () =>
          set(
            (state) => {
              const newTheme = state.theme === 'light' ? 'dark' : 'light';
              localStorage.setItem('theme', newTheme);
              return { theme: newTheme };
            },
            false,
            'toggleTheme'
          ),
      }),
      {
        name: 'theme',
        partialize: (state): Pick<ThemeStore, 'theme'> => ({ theme: state.theme }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            localStorage.setItem('theme', state.theme);
          }
        },
        storage: {
          getItem: (name: string) => {
            const value = localStorage.getItem(name);
            if (value === 'light' || value === 'dark') {
              return JSON.stringify({ state: { theme: value } });
            }
            return null;
          },
          setItem: (name: string, value: string) => {
            try {
              const parsed = JSON.parse(value);
              if (parsed && typeof parsed === 'object' && parsed.state) {
                const theme = parsed.state.theme;
                if (theme === 'light' || theme === 'dark') {
                  localStorage.setItem(name, theme);
                }
              }
            } catch {}
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name);
          },
        } as unknown as PersistStorage<Pick<ThemeStore, 'theme'>>,
      }
    ),
    { name: 'ThemeStore' }
  )
);
