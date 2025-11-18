import dayjs from './dayjs';

export const formatDate = (
  dateString: string,
  t: (key: string) => string,
  locale: string = 'ru'
): string => {
  const date = dayjs(dateString);
  const day = date.date();
  const monthIndex = date.month();
  const year = date.year();

  const monthKey = `month.${monthIndex}`;
  const month = t(monthKey);

  if (locale === 'ru' || locale === 'kz') {
    return `${day} ${month} ${year}`;
  } else {
    return `${month} ${day}, ${year}`;
  }
};
