import type {
  DocumentDto,
  DocumentsResponseDto,
  FilterDocumentsDto,
} from '../../../entities/document/model/types';
import apiClient from '../../../shared/api/client';
import { API_URL } from '../../../shared/config/constants';
import { stringifyQuery } from '../../../shared/lib/query-string';

const CHUNK_SIZE = 2 * 1024 ** 2;

interface UploadChunkParams {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  chunk: Blob;
  fileName: string;
  mimeType: string;
}

export const documentsApi = {
  getAll: async (filters?: FilterDocumentsDto): Promise<DocumentsResponseDto> => {
    const queryString = stringifyQuery({
      ...(filters?.name && { name: filters.name }),
      ...(filters?.mimeType && { mimeType: filters.mimeType }),
      ...(filters?.isPrivate !== undefined && { isPrivate: filters.isPrivate }),
      ...(filters?.minSize !== undefined && { minSize: filters.minSize }),
      ...(filters?.maxSize !== undefined && { maxSize: filters.maxSize }),
      ...(filters?.sortBy && { sortBy: filters.sortBy }),
      ...(filters?.sortOrder && { sortOrder: filters.sortOrder }),
      ...(filters?.page && { page: filters.page }),
      ...(filters?.limit && { limit: filters.limit }),
      ...(filters?.onlyMine !== undefined && { onlyMine: filters.onlyMine }),
    });

    const response = await apiClient.get<DocumentsResponseDto>(
      `/documents${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },
  getOne: async (id: string): Promise<DocumentDto> => {
    const response = await apiClient.get<DocumentDto>(`/documents/${id}`);
    return response.data;
  },
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<DocumentDto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<DocumentDto>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },
  uploadChunk: async (params: UploadChunkParams): Promise<void> => {
    const formData = new FormData();
    formData.append('fileId', params.fileId);
    formData.append('chunkIndex', params.chunkIndex.toString());
    formData.append('totalChunks', params.totalChunks.toString());
    formData.append('chunk', params.chunk);
    formData.append('fileName', params.fileName);
    formData.append('mimeType', params.mimeType);

    await apiClient.post('/documents/chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  finalizeChunkedUpload: async (fileId: string): Promise<DocumentDto> => {
    const response = await apiClient.post<DocumentDto>(`/documents/chunk/${fileId}/finalize`);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
  getFileUrl: (id: string): string => {
    return `${API_URL}/documents/${id}/file`;
  },
  download: async (id: string, originalName: string): Promise<void> => {
    const response = await apiClient.get(`/documents/${id}/file`, {
      params: { download: 'true' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadMany: async (
    ids: string[],
    documents: Array<{ id: string; originalName: string }>
  ): Promise<void> => {
    const downloadPromises = ids.map((id) => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return Promise.resolve();
      return documentsApi.download(id, doc.originalName);
    });
    await Promise.all(downloadPromises);
  },
  update: async (id: string, updateData: { isPrivate?: boolean }): Promise<DocumentDto> => {
    const response = await apiClient.patch<DocumentDto>(`/documents/${id}`, updateData);
    return response.data;
  },
  updateMany: async (
    ids: string[],
    updateData: { isPrivate?: boolean }
  ): Promise<DocumentDto[]> => {
    const response = await apiClient.patch<DocumentDto[]>('/documents/batch', {
      ids,
      ...updateData,
    });
    return response.data;
  },
  deleteMany: async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map((id) => documentsApi.delete(id)));
  },
  uploadMultiple: async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void,
    useChunks = true
  ): Promise<DocumentDto[]> => {
    const uploadPromises = files.map(async (file, fileIndex) => {
      const fileId = `${Date.now()}-${fileIndex}-${Math.random().toString(36).substring(7)}`;

      if (useChunks && file.size > CHUNK_SIZE) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const chunks: Blob[] = [];

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          chunks.push(file.slice(start, end));
        }

        const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
          await documentsApi.uploadChunk({
            fileId,
            chunkIndex,
            totalChunks,
            chunk,
            fileName: file.name,
            mimeType: file.type,
          });

          if (onProgress) {
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            onProgress(fileIndex, progress);
          }
        });

        await Promise.all(chunkPromises);

        const document = await documentsApi.finalizeChunkedUpload(fileId);
        if (onProgress) {
          onProgress(fileIndex, 100);
        }
        return document;
      } else {
        return new Promise<DocumentDto>((resolve, reject) => {
          documentsApi
            .upload(file, (progress) => {
              if (onProgress) {
                onProgress(fileIndex, progress);
              }
            })
            .then(resolve)
            .catch(reject);
        });
      }
    });

    return Promise.all(uploadPromises);
  },
};
