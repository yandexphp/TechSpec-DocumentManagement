import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as broadcastService from '../../../../shared/services/broadcast.service';
import { documentsApi } from '../../api/documentsApi';
import {
  useDeleteDocument,
  useDocument,
  useDocuments,
  useDownloadDocument,
  useUploadDocument,
} from '../useDocuments';

vi.mock('../../api/documentsApi');
vi.mock('../../../../shared/services/broadcast.service', () => ({
  broadcastService: {
    subscribe: vi.fn(() => vi.fn()),
    broadcast: vi.fn(),
  },
  BroadcastEventType: {
    AUTH_LOGIN: 'AUTH_LOGIN',
    AUTH_LOGOUT: 'AUTH_LOGOUT',
    DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  },
}));
describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
  it('should fetch documents', async () => {
    const mockDocuments = {
      documents: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    vi.mocked(documentsApi.getAll).mockResolvedValue(mockDocuments);
    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(mockDocuments);
  });
  it('should fetch single document', async () => {
    const mockDocument = {
      id: 'doc-123',
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      filePath: '/documents/test.pdf',
      fileURL: 'http://example.com/test.pdf',
      isPrivate: false,
      userId: 'user-123',
      authorNickname: 'testuser',
      createdAt: new Date().toISOString(),
    };
    vi.mocked(documentsApi.getOne).mockResolvedValue(mockDocument);
    const { result } = renderHook(() => useDocument('doc-123'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(mockDocument);
  });
  it('should upload document', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const mockDocument = {
      id: 'doc-123',
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      filePath: '/documents/test.pdf',
      fileURL: 'http://example.com/test.pdf',
      isPrivate: false,
      userId: 'user-123',
      authorNickname: 'testuser',
      createdAt: new Date().toISOString(),
    };
    vi.mocked(documentsApi.upload).mockResolvedValue(mockDocument);
    vi.mocked(broadcastService.broadcastService.broadcast).mockImplementation(() => {});
    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });
    result.current.mutate(mockFile);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(documentsApi.upload).toHaveBeenCalledWith(mockFile);
  });
  it('should delete document', async () => {
    vi.mocked(documentsApi.delete).mockResolvedValue(undefined);
    vi.mocked(broadcastService.broadcastService.broadcast).mockImplementation(() => {});
    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: createWrapper(),
    });
    result.current.mutate('doc-123');
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(documentsApi.delete).toHaveBeenCalledWith('doc-123');
  });
  it('should download document', async () => {
    vi.mocked(documentsApi.download).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ id: 'doc-123', originalName: 'test.pdf' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(documentsApi.download).toHaveBeenCalledWith('doc-123', 'test.pdf');
  });
});
