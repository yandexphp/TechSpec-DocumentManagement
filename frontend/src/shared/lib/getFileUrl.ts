import { API_URL } from '../config/constants';
export const getFileUrl = (filePath: string | null | undefined): string | undefined => {
  if (!filePath) {
    return undefined;
  }
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const pathParts = cleanPath.split('/');
  const encodedPath = pathParts.map((part) => encodeURIComponent(part)).join('/');
  return `${API_URL}/storage/${encodedPath}`;
};
