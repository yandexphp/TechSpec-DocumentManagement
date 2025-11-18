import { DarkMode, LightMode } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { startTransition, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { scaleIn } from '../shared/lib/animations';
import { cn } from '../shared/lib/utils';
import { useThemeStore } from '../shared/store/theme.store';

export const ThemeSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (buttonRef.current) {
      scaleIn(buttonRef.current);
    }
  }, []);

  const handleToggle = () => {
    startTransition(() => {
      toggleTheme();
    });
  };

  return (
    <Tooltip title={theme === 'dark' ? t('Светлая тема') : t('Темная тема')}>
      <IconButton
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(className, 'transition-all hover:scale-110')}
      >
        {theme === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
};
