import {
  TableChart as ExcelIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  Description as PdfIcon,
  Slideshow as PowerpointIcon,
  TextFields as TextIcon,
  Article as WordIcon,
} from '@mui/icons-material';
import type { ReactElement } from 'react';

export const getFileIcon = (mimeType: string, fileName: string): ReactElement => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return <PdfIcon className="text-red-500 dark:text-red-400" />;
  }

  if (
    mimeType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)
  ) {
    return <ImageIcon className="text-blue-500 dark:text-blue-400" />;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    ['doc', 'docx'].includes(extension)
  ) {
    return <WordIcon className="text-blue-600 dark:text-blue-400" />;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ['xls', 'xlsx'].includes(extension)
  ) {
    return <ExcelIcon className="text-green-600 dark:text-green-400" />;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    ['ppt', 'pptx'].includes(extension)
  ) {
    return <PowerpointIcon className="text-orange-500 dark:text-orange-400" />;
  }

  if (mimeType === 'text/plain' || mimeType === 'text/csv' || ['txt', 'csv'].includes(extension)) {
    return <TextIcon className="text-gray-600 dark:text-gray-400" />;
  }

  return <FileIcon className="text-gray-500 dark:text-gray-400" />;
};
