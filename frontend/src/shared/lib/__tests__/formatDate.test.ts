import { describe, expect, it } from 'vitest';

import { formatDate } from '../formatDate';

describe('formatDate', () => {
  const monthNames: Record<string, Record<number, string>> = {
    ru: {
      0: 'января',
      1: 'февраля',
      2: 'марта',
      3: 'апреля',
      4: 'мая',
      5: 'июня',
      6: 'июля',
      7: 'августа',
      8: 'сентября',
      9: 'октября',
      10: 'ноября',
      11: 'декабря',
    },
    en: {
      0: 'January',
      1: 'February',
      2: 'March',
      3: 'April',
      4: 'May',
      5: 'June',
      6: 'July',
      7: 'August',
      8: 'September',
      9: 'October',
      10: 'November',
      11: 'December',
    },
    kz: {
      0: 'қаңтар',
      1: 'ақпан',
      2: 'наурыз',
      3: 'сәуір',
      4: 'мамыр',
      5: 'маусым',
      6: 'шілде',
      7: 'тамыз',
      8: 'қыркүйек',
      9: 'қазан',
      10: 'қараша',
      11: 'желтоқсан',
    },
  };

  const createT = (locale: string) => (key: string) => {
    if (key.startsWith('month.')) {
      const monthIndex = parseInt(key.replace('month.', ''), 10);
      return monthNames[locale]?.[monthIndex] || key;
    }
    return key;
  };

  it('should format date in Russian', () => {
    const date = '2024-03-15T10:00:00Z';
    const result = formatDate(date, createT('ru'), 'ru');
    expect(result).toContain('15');
    expect(result).toContain('марта');
    expect(result).toContain('2024');
  });

  it('should format date in English', () => {
    const date = '2024-03-15T10:00:00Z';
    const result = formatDate(date, createT('en'), 'en');
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format date in Kazakh', () => {
    const date = '2024-03-15T10:00:00Z';
    const result = formatDate(date, createT('kz'), 'kz');
    expect(result).toContain('15');
    expect(result).toContain('наурыз');
    expect(result).toContain('2024');
  });
});
