import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { BroadcastEventType } from '../../../entities/broadcast/model/types';
import type { FilterDocumentsDto } from '../../../entities/document/model/types';
import { showToast } from '../../../shared/lib/toast';
import { broadcastService } from '../../../shared/services/broadcast.service';
import { documentsApi } from '../api/documentsApi';

export const useDocuments = (filters?: FilterDocumentsDto) => {
  return useQuery({
    queryKey: [
      'documents',
      filters?.name,
      filters?.mimeType,
      filters?.isPrivate,
      filters?.minSize,
      filters?.maxSize,
      filters?.sortBy,
      filters?.sortOrder,
      filters?.page,
      filters?.limit,
      filters?.onlyMine,
    ],
    queryFn: () => documentsApi.getAll(filters),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export const useDocument = (id: string) => {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.getOne(id),
    enabled: !!id,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (file: File) => {
      return documentsApi.upload(file);
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      broadcastService.broadcast(BroadcastEventType.DOCUMENT_CREATED, {
        document,
      });
      showToast.success(t('Документ успешно загружен'));
    },
    onError: () => {
      showToast.error(t('Ошибка загрузки файлов'));
    },
  });
};

export const useUploadMultipleDocuments = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      files,
      onProgress,
      useChunks = true,
    }: {
      files: File[];
      onProgress?: (fileIndex: number, progress: number) => void;
      useChunks?: boolean;
    }) => {
      return documentsApi.uploadMultiple(files, onProgress, useChunks);
    },
    onSuccess: (documents) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      documents.forEach((document) => {
        broadcastService.broadcast(BroadcastEventType.DOCUMENT_CREATED, {
          document,
        });
      });
      showToast.success(t('Документы успешно загружены'));
    },
    onError: () => {
      showToast.error(t('Ошибка загрузки файлов'));
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      await documentsApi.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      broadcastService.broadcast(BroadcastEventType.DOCUMENT_DELETED, {
        documentId: id,
      });
      showToast.success(t('Документ успешно удален'));
    },
    onError: () => {
      showToast.error(t('Произошла ошибка'));
    },
  });
};

export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async ({ id, originalName }: { id: string; originalName: string }) => {
      await documentsApi.download(id, originalName);
    },
  });
};

export const useBulkDownloadDocuments = () => {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({
      ids,
      documents,
    }: {
      ids: string[];
      documents: Array<{ id: string; originalName: string }>;
    }) => {
      await documentsApi.downloadMany(ids, documents);
    },
    onSuccess: () => {
      showToast.success(t('Документы успешно скачаны'));
    },
    onError: () => {
      showToast.error(t('Ошибка скачивания документов'));
    },
  });
};

export const useBulkDeleteDocuments = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await documentsApi.deleteMany(ids);
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      ids.forEach((id) => {
        broadcastService.broadcast(BroadcastEventType.DOCUMENT_DELETED, {
          documentId: id,
        });
      });
      showToast.success(t('Документы успешно удалены'));
    },
    onError: () => {
      showToast.error(t('Ошибка удаления документов'));
    },
  });
};

export const useUpdateDocumentPrivacy = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, isPrivate }: { id: string; isPrivate: boolean }) => {
      return documentsApi.update(id, { isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast.success(t('Приватность документа успешно изменена'));
    },
    onError: () => {
      showToast.error(t('Ошибка изменения приватности'));
    },
  });
};

export const useBulkUpdateDocumentsPrivacy = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ ids, isPrivate }: { ids: string[]; isPrivate: boolean }) => {
      return documentsApi.updateMany(ids, { isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast.success(t('Приватность документов успешно изменена'));
    },
    onError: () => {
      showToast.error(t('Ошибка изменения приватности'));
    },
  });
};
