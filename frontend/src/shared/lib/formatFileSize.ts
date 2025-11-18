export const formatFileSize = (bytes: number, t: (key: string) => string): string => {
  if (bytes === 0) return `0 ${t('байт')}`;

  const k = 1024;
  const sizes = [
    { key: 'байт', value: 1 },
    { key: 'кб', value: k },
    { key: 'мб', value: k ** 2 },
    { key: 'гб', value: k ** 3 },
    { key: 'тб', value: k ** 4 },
    { key: 'пб', value: k ** 5 },
  ];

  let i = 0;
  while (i < sizes.length - 1 && bytes >= sizes[i + 1].value) {
    i++;
  }

  const size = bytes / sizes[i].value;
  let rounded: number;
  if (size < 1) {
    rounded = Math.round(size * 100) / 100;
  } else if (size < 10) {
    rounded = Math.round(size * 10) / 10;
  } else {
    rounded = Math.round(size);
  }

  return `${rounded} ${t(sizes[i].key)}`;
};
