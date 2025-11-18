import type { DocumentDto } from '../../entities/document/model/types';

export interface AuthLoginPayload {
  token: string;
}

export interface DocumentCreatedPayload {
  document: DocumentDto;
}

export interface DocumentDeletedPayload {
  documentId: string;
  documentName?: string;
}

export type BroadcastPayload = AuthLoginPayload | DocumentCreatedPayload | DocumentDeletedPayload;
