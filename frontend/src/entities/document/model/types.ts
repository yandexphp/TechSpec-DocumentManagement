import type { TNullable } from '../../../shared/types/nullable';

export interface DocumentDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
  fileURL: string;
  isPrivate: boolean;
  createdAt: string;
  userId: string;
  authorNickname: TNullable<string>;
}

export interface DocumentsResponseDto {
  documents: DocumentDto[];
  total: number;
  page: number;
  limit: number;
}

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const SortField = {
  ORIGINAL_NAME: 'originalName',
  SIZE: 'size',
  CREATED_AT: 'createdAt',
  MIME_TYPE: 'mimeType',
  IS_PRIVATE: 'isPrivate',
} as const;

export type SortField = (typeof SortField)[keyof typeof SortField];

export interface FilterDocumentsDto {
  name?: string;
  mimeType?: string;
  isPrivate?: boolean;
  minSize?: number;
  maxSize?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  onlyMine?: boolean;
}
