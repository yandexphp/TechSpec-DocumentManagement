import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocumentDto } from '../../../../entities/document/model/types';
import { UploadManager } from '../uploadManager';
import { UploadQueue } from '../uploadQueue';

vi.mock('../../../../shared/api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('UploadQueue', () => {
  let uploadQueue: UploadQueue;
  let uploadManager: UploadManager;

  beforeEach(() => {
    uploadManager = new UploadManager();
    uploadQueue = new UploadQueue(uploadManager, 1);
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should enqueue and upload file', async () => {
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

      vi.spyOn(uploadManager, 'uploadFile').mockResolvedValue(mockDocument);

      const result = await uploadQueue.enqueue(file, 0);

      expect(uploadManager.uploadFile).toHaveBeenCalledWith(file, 0, undefined);
      expect(result).toEqual(mockDocument);
    });

    it('should limit concurrent uploads', async () => {
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
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

      vi.spyOn(uploadManager, 'uploadFile').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDocument), 100))
      );

      const promise1 = uploadQueue.enqueue(file1, 0);
      const promise2 = uploadQueue.enqueue(file2, 1);

      expect(uploadQueue.getActiveCount()).toBe(1);
      expect(uploadQueue.getQueueLength()).toBe(1);

      await Promise.all([promise1, promise2]);

      expect(uploadManager.uploadFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('pause', () => {
    it('should pause upload', () => {
      const pauseSpy = vi.spyOn(uploadManager, 'pause');
      uploadQueue.pause('file-id');
      expect(pauseSpy).toHaveBeenCalledWith('file-id');
    });
  });

  describe('resume', () => {
    it('should resume upload', () => {
      const resumeSpy = vi.spyOn(uploadManager, 'resume');
      uploadQueue.resume('file-id');
      expect(resumeSpy).toHaveBeenCalledWith('file-id');
    });
  });

  describe('cancel', () => {
    it('should cancel upload', () => {
      const cancelSpy = vi.spyOn(uploadManager, 'cancel');
      vi.spyOn(uploadManager, 'getAllTasks').mockReturnValue([
        {
          fileId: 'file-id',
          fileIndex: 0,
          file: new File(['content'], 'test.pdf'),
          controller: new AbortController(),
          status: 'uploading',
          progress: 0,
          uploadedChunks: 0,
          totalChunks: 1,
        },
      ]);

      uploadQueue.cancel('file-id');

      expect(cancelSpy).toHaveBeenCalledWith('file-id');
      expect(uploadQueue.getActiveCount()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear queue and active uploads', async () => {
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

      vi.spyOn(uploadManager, 'uploadFile').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDocument), 100))
      );

      uploadQueue.enqueue(file, 0);
      uploadQueue.clear();

      expect(uploadQueue.getQueueLength()).toBe(0);
      expect(uploadQueue.getActiveCount()).toBe(0);
    });
  });

  describe('getActiveCount', () => {
    it('should return active upload count', async () => {
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

      vi.spyOn(uploadManager, 'uploadFile').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDocument), 100))
      );

      uploadQueue.enqueue(file, 0);

      expect(uploadQueue.getActiveCount()).toBe(1);

      await uploadQueue.enqueue(file, 0);
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });
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

      vi.spyOn(uploadManager, 'uploadFile').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDocument), 100))
      );

      uploadQueue.enqueue(file1, 0);
      uploadQueue.enqueue(file2, 1);

      expect(uploadQueue.getQueueLength()).toBe(1);

      await Promise.all([uploadQueue.enqueue(file1, 0), uploadQueue.enqueue(file2, 1)]);
    });
  });
});
