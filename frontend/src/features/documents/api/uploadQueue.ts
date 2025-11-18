import type { DocumentDto } from '../../../entities/document/model/types';
import type { UploadManager } from './uploadManager';

interface QueuedUpload {
  file: File;
  fileIndex: number;
  onProgress?: (progress: number) => void;
  resolve: (value: DocumentDto) => void;
  reject: (reason?: Error) => void;
}

export class UploadQueue {
  private queue: QueuedUpload[] = [];
  private activeUploads: Map<string, Promise<DocumentDto>> = new Map();
  private readonly maxConcurrent: number;
  private readonly uploadManager: UploadManager;

  constructor(uploadManager: UploadManager, maxConcurrent = 3) {
    this.uploadManager = uploadManager;
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue(
    file: File,
    fileIndex: number,
    onProgress?: (progress: number) => void
  ): Promise<DocumentDto> {
    return new Promise<DocumentDto>((resolve, reject) => {
      this.queue.push({
        file,
        fileIndex,
        onProgress,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeUploads.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      return;
    }

    const uploadKey = `${next.fileIndex}-${next.file.name}`;
    const uploadPromise = this.uploadManager
      .uploadFile(next.file, next.fileIndex, next.onProgress)
      .then((result) => {
        this.activeUploads.delete(uploadKey);
        next.resolve(result);
        this.processQueue();
        return result;
      })
      .catch((error) => {
        this.activeUploads.delete(uploadKey);
        next.reject(error);
        this.processQueue();
        throw error;
      });

    this.activeUploads.set(uploadKey, uploadPromise);
  }

  pause(fileId: string): void {
    this.uploadManager.pause(fileId);
  }

  resume(fileId: string): void {
    this.uploadManager.resume(fileId);
  }

  cancel(fileId: string): void {
    this.uploadManager.cancel(fileId);
    const tasks = this.uploadManager.getAllTasks();
    const task = tasks.find((t) => t.fileId === fileId);
    if (task) {
      const uploadKey = `${task.fileIndex}-${task.file.name}`;
      this.activeUploads.delete(uploadKey);
    }
  }

  getActiveCount(): number {
    return this.activeUploads.size;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.forEach((item) => {
      item.reject(new Error('Upload queue cleared'));
    });
    this.queue = [];
    this.activeUploads.forEach((promise) => {
      promise.catch(() => {});
    });
    this.activeUploads.clear();
    this.uploadManager.clear();
  }
}
