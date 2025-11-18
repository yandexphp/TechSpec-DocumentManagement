import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../../../../shared/api/client';
import { documentsApi } from '../documentsApi';

vi.mock('../../../../shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../../shared/config/constants', () => ({
  API_URL: '/api',
}));

describe('documentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all documents without filters', async () => {
      const mockResponse = {
        documents: [],
        total: 0,
        page: 1,
        limit: 30,
      };
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockResponse });

      const result = await documentsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/documents');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch documents with filters', async () => {
      const mockResponse = {
        documents: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockResponse });

      const result = await documentsApi.getAll({
        name: 'test',
        page: 1,
        limit: 10,
      });

      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/documents'));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOne', () => {
    it('should fetch single document', async () => {
      const mockDocument = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const result = await documentsApi.getOne('1');

      expect(apiClient.get).toHaveBeenCalledWith('/documents/1');
      expect(result).toEqual(mockDocument);
    });
  });

  describe('upload', () => {
    it('should upload file', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const result = await documentsApi.upload(mockFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/documents',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
      expect(result).toEqual(mockDocument);
    });

    it('should call onProgress callback', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };
      const onProgress = vi.fn();
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      await documentsApi.upload(mockFile, onProgress);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/documents',
        expect.any(FormData),
        expect.objectContaining({
          onUploadProgress: expect.any(Function),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await documentsApi.delete('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/documents/1');
    });
  });

  describe('getFileUrl', () => {
    it('should return file URL', () => {
      const url = documentsApi.getFileUrl('1');
      expect(url).toBe('/api/documents/1/file');
    });
  });

  describe('download', () => {
    it('should download file', async () => {
      const mockBlob = new Blob(['content']);
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockBlob });

      const createObjectURLSpy = vi
        .spyOn(window.URL, 'createObjectURL')
        .mockReturnValue('blob:url');
      const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL');
      const mockAnchor = {
        href: '',
        setAttribute: vi.fn(),
        click: vi.fn(),
        remove: vi.fn(),
      } as unknown as HTMLAnchorElement;
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      const mockNode = {} as Node;
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockNode);

      await documentsApi.download('1', 'test.pdf');

      expect(apiClient.get).toHaveBeenCalledWith('/documents/1/file', {
        params: { download: 'true' },
        responseType: 'blob',
      });
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const mockDocument = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: true,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const result = await documentsApi.update('1', { isPrivate: true });

      expect(apiClient.patch).toHaveBeenCalledWith('/documents/1', { isPrivate: true });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('updateMany', () => {
    it('should update multiple documents', async () => {
      const mockDocuments = [
        {
          id: '1',
          originalName: 'test1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          filePath: '/test1.pdf',
          fileURL: 'http://example.com/test1.pdf',
          isPrivate: true,
          createdAt: new Date().toISOString(),
          userId: 'user-1',
          authorNickname: null,
        },
      ];
      (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocuments });

      const result = await documentsApi.updateMany(['1'], { isPrivate: true });

      expect(apiClient.patch).toHaveBeenCalledWith('/documents/batch', {
        ids: ['1'],
        isPrivate: true,
      });
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple documents', async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await documentsApi.deleteMany(['1', '2']);

      expect(apiClient.delete).toHaveBeenCalledTimes(2);
      expect(apiClient.delete).toHaveBeenCalledWith('/documents/1');
      expect(apiClient.delete).toHaveBeenCalledWith('/documents/2');
    });
  });
});
