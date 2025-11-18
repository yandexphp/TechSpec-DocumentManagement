export const BroadcastEventType = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  DOCUMENTS_UPDATED: 'DOCUMENTS_UPDATED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  DOCUMENT_CREATED: 'DOCUMENT_CREATED',
} as const;

export type BroadcastEventType = (typeof BroadcastEventType)[keyof typeof BroadcastEventType];
