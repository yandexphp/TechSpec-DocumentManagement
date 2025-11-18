import { CssBaseline, createTheme, ThemeProvider as MUIThemeProvider } from '@mui/material';
import { type ReactNode, useEffect } from 'react';

import { useThemeStore } from '../shared/store/theme.store';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme } = useThemeStore();

  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: theme === 'dark' ? '#90caf9' : '#1976d2',
      },
      background: {
        default: theme === 'dark' ? '#121212' : '#ffffff',
        paper: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
};
