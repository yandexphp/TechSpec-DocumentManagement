export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  DOCUMENTS: '/documents',
  DOCUMENT_VIEW: '/documents/$id',
  DOCUMENT_UPLOAD: '/documents/upload',
  PROFILE: '/profile',
} as const;

export const getDocumentViewRoute = (id: string): string => {
  return ROUTES.DOCUMENT_VIEW.replace('$id', id);
};

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
