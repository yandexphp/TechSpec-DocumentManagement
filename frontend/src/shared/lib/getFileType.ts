export const getFileTypeLabel = (mimeType: string, t: (key: string) => string): string => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'fileType.pdf',
    'image/png': 'fileType.png',
    'image/jpeg': 'fileType.jpeg',
    'image/jpg': 'fileType.jpg',
    'image/gif': 'fileType.gif',
    'image/webp': 'fileType.webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fileType.word',
    'application/msword': 'fileType.word',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fileType.excel',
    'application/vnd.ms-excel': 'fileType.excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'fileType.powerpoint',
    'application/vnd.ms-powerpoint': 'fileType.powerpoint',
    'text/plain': 'fileType.text',
    'text/csv': 'fileType.csv',
  };

  const key = typeMap[mimeType];
  if (key) {
    return t(key);
  }

  const fallback = mimeType.split('/')[1]?.toUpperCase();
  return fallback || t('fileType.unknown');
};
