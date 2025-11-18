import { FormControl, MenuItem, Select } from '@mui/material';
import { startTransition, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { scaleIn } from '../../../shared/lib/animations';
import { cn } from '../../../shared/lib/utils';
import { useI18nStore } from '../../../shared/store/i18n.store';

export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const selectRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useI18nStore();

  useEffect(() => {
    if (selectRef.current) {
      scaleIn(selectRef.current);
    }
  }, []);

  const handleChange = (lang: 'ru' | 'en' | 'kz') => {
    startTransition(() => {
      setLanguage(lang);
    });
  };

  return (
    <FormControl size="small" className={cn(className)} ref={selectRef}>
      <Select
        value={language}
        onChange={(e) => handleChange(e.target.value as 'ru' | 'en' | 'kz')}
        className={cn('min-w-[100px] transition-all')}
      >
        <MenuItem value="ru">{t('Рус')}</MenuItem>
        <MenuItem value="en">{t('Англ')}</MenuItem>
        <MenuItem value="kz">{t('Қаз')}</MenuItem>
      </Select>
    </FormControl>
  );
};
