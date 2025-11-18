export const BroadcastEventType = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
} as const;

export type BroadcastEventType = (typeof BroadcastEventType)[keyof typeof BroadcastEventType];
