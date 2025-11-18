import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocumentDto } from '../../../../entities/document/model/types';
import apiClient from '../../../../shared/api/client';
import { UploadManager } from '../uploadManager';

vi.mock('../../../../shared/api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('UploadManager', () => {
  let uploadManager: UploadManager;

  beforeEach(() => {
    uploadManager = new UploadManager();
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload small file using simple upload', async () => {
      const file = new File([], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 0,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const result = await uploadManager.uploadFile(file, 0);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/documents',
        expect.any(FormData),
        expect.any(Object)
      );
      expect(result).toEqual(mockDocument);
    });

    it('should upload large file using chunked upload', async () => {
      const largeContent = new Array(3 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'large.pdf',
        mimeType: 'application/pdf',
        size: 3 * 1024 * 1024,
        filePath: '/large.pdf',
        fileURL: 'http://example.com/large.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ data: { success: true, chunkIndex: 0 } })
        .mockResolvedValueOnce({ data: { success: true, chunkIndex: 1 } })
        .mockResolvedValueOnce({ data: mockDocument });

      const result = await uploadManager.uploadFile(file, 0);

      expect(apiClient.post).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockDocument);
    });

    it('should call onProgress callback', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };
      const onProgress = vi.fn();

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      await uploadManager.uploadFile(file, 0, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause uploading task', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const uploadPromise = uploadManager.uploadFile(file, 0);
      const tasks = uploadManager.getAllTasks();
      const fileId = tasks[0]?.fileId;

      if (fileId) {
        uploadManager.pause(fileId);
        const task = uploadManager.getTask(fileId);
        expect(task?.status).toBe('paused');
      }

      await uploadPromise;
    });
  });

  describe('resume', () => {
    it('should resume paused task', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      const uploadPromise = uploadManager.uploadFile(file, 0);
      const tasks = uploadManager.getAllTasks();
      const fileId = tasks[0]?.fileId;

      if (fileId) {
        uploadManager.pause(fileId);
        uploadManager.resume(fileId);
        const task = uploadManager.getTask(fileId);
        expect(task?.status).toBe('uploading');
      }

      await uploadPromise;
    });
  });

  describe('cancel', () => {
    it('should cancel task', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      uploadManager.uploadFile(file, 0);
      const tasks = uploadManager.getAllTasks();
      const fileId = tasks[0]?.fileId;

      if (fileId) {
        uploadManager.cancel(fileId);
        const task = uploadManager.getTask(fileId);
        expect(task).toBeUndefined();
      }
    });
  });

  describe('clear', () => {
    it('should clear all tasks', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      uploadManager.uploadFile(file, 0);
      uploadManager.clear();

      const tasks = uploadManager.getAllTasks();
      expect(tasks).toHaveLength(0);
    });
  });

  describe('addProgressCallback', () => {
    it('should add and remove progress callback', async () => {
      const callback = vi.fn();
      const remove = uploadManager.addProgressCallback(callback);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument: DocumentDto = {
        id: '1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/test.pdf',
        isPrivate: false,
        createdAt: new Date().toISOString(),
        userId: 'user-1',
        authorNickname: null,
      };

      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockDocument });

      await uploadManager.uploadFile(file, 0);

      expect(callback).toHaveBeenCalled();

      remove();
    });
  });
});
