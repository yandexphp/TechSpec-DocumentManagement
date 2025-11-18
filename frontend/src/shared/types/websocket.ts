import type { DocumentDto } from '../../entities/document/model/types';

export interface DocumentUploadedEvent {
  document: DocumentDto;
}

export interface DocumentDeletedEvent {
  documentId: string;
  documentName?: string;
}

export type WebSocketEventData = DocumentUploadedEvent | DocumentDeletedEvent;

export type WebSocketEventType = 'document:uploaded' | 'document:deleted';

export type WebSocketEventListener<T extends WebSocketEventType> = (
  data: T extends 'document:uploaded'
    ? DocumentUploadedEvent
    : T extends 'document:deleted'
      ? DocumentDeletedEvent
      : never
) => void;
