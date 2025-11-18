import type { DocumentDto } from '../../../entities/document/model/types';
import apiClient from '../../../shared/api/client';

const CHUNK_SIZE = 2 * 1024 ** 2;
const MAX_CONCURRENT_CHUNKS = 3;
const CHUNK_DELAY_MS = 300;

class ChunkSemaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.running < MAX_CONCURRENT_CHUNKS) {
      this.running++;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

const chunkSemaphore = new ChunkSemaphore();

export interface UploadController {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export interface UploadProgress {
  fileIndex: number;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
}

export interface UploadTask {
  file: File;
  fileIndex: number;
  fileId: string;
  controller: AbortController;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number;
  uploadedChunks: number;
  totalChunks: number;
  error?: string;
}

export class UploadManager {
  private tasks: Map<string, UploadTask> = new Map();
  private onProgressCallbacks: ((progress: UploadProgress) => void)[] = [];

  addProgressCallback(callback: (progress: UploadProgress) => void): () => void {
    this.onProgressCallbacks.push(callback);
    return () => {
      const index = this.onProgressCallbacks.indexOf(callback);
      if (index > -1) {
        this.onProgressCallbacks.splice(index, 1);
      }
    };
  }

  private notifyProgress(
    fileIndex: number,
    progress: number,
    uploadedBytes: number,
    totalBytes: number
  ): void {
    this.onProgressCallbacks.forEach((callback) => {
      callback({ fileIndex, progress, uploadedBytes, totalBytes });
    });
  }

  async uploadFile(
    file: File,
    fileIndex: number,
    onProgress?: (progress: number) => void
  ): Promise<DocumentDto> {
    const fileId = `${Date.now()}-${fileIndex}-${Math.random().toString(36).substring(7)}`;
    const controller = new AbortController();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const task: UploadTask = {
      file,
      fileIndex,
      fileId,
      controller,
      status: 'pending',
      progress: 0,
      uploadedChunks: 0,
      totalChunks,
    };

    this.tasks.set(fileId, task);

    try {
      if (file.size > 0) {
        return await this.uploadChunked(file, fileId, task, onProgress);
      } else {
        return await this.uploadSimple(file, task, onProgress);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        task.status = 'cancelled';
        throw new Error('Upload cancelled');
      }
      task.status = 'error';
      task.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async uploadChunked(
    file: File,
    fileId: string,
    task: UploadTask,
    onProgress?: (progress: number) => void
  ): Promise<DocumentDto> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunks: Blob[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      chunks.push(file.slice(start, end));
    }

    task.status = 'uploading';

    for (let chunkIndex = task.uploadedChunks; chunkIndex < totalChunks; chunkIndex++) {
      if (task.controller.signal.aborted) {
        throw new Error('Upload cancelled');
      }

      let currentTask = this.tasks.get(fileId);
      while (currentTask && currentTask.status === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (task.controller.signal.aborted) {
          throw new Error('Upload cancelled');
        }
        currentTask = this.tasks.get(fileId);
      }

      currentTask = this.tasks.get(fileId);
      if (!currentTask || currentTask.status === 'cancelled') {
        throw new Error('Upload cancelled');
      }

      task.status = 'uploading';
      if (currentTask) {
        currentTask.status = 'uploading';
      }

      const chunk = chunks[chunkIndex];
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('chunk', chunk);
      formData.append('fileName', file.name);
      formData.append('mimeType', file.type);

      await chunkSemaphore.acquire();

      let retryCount = 0;
      const maxRetries = 5;
      const baseDelay = 2000;

      try {
        while (retryCount <= maxRetries) {
          try {
            await apiClient.post('/documents/chunk', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              signal: task.controller.signal,
            });
            break;
          } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status === 429 && retryCount < maxRetries) {
              const delay = baseDelay * 2 ** retryCount + Math.random() * 2000;
              await new Promise((resolve) => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }
            throw error;
          }
        }

        if (chunkIndex < totalChunks - 1) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      } finally {
        chunkSemaphore.release();
      }

      task.uploadedChunks = chunkIndex + 1;
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      task.progress = progress;

      const uploadedBytes = (chunkIndex + 1) * CHUNK_SIZE;
      const totalBytes = file.size;

      if (onProgress) {
        onProgress(progress);
      }
      this.notifyProgress(task.fileIndex, progress, uploadedBytes, totalBytes);
    }

    const document = await apiClient.post<DocumentDto>(
      `/documents/chunk/${fileId}/finalize`,
      {},
      {
        signal: task.controller.signal,
      }
    );

    task.status = 'completed';
    task.progress = 100;
    if (onProgress) {
      onProgress(100);
    }
    this.notifyProgress(task.fileIndex, 100, file.size, file.size);

    return document.data;
  }

  private async uploadSimple(
    file: File,
    task: UploadTask,
    onProgress?: (progress: number) => void
  ): Promise<DocumentDto> {
    const formData = new FormData();
    formData.append('file', file);

    task.status = 'uploading';

    const response = await apiClient.post<DocumentDto>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: task.controller.signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          task.progress = progress;
          if (onProgress) {
            onProgress(progress);
          }
          this.notifyProgress(task.fileIndex, progress, progressEvent.loaded, progressEvent.total);
        }
      },
    });

    task.status = 'completed';
    task.progress = 100;
    if (onProgress) {
      onProgress(100);
    }
    this.notifyProgress(task.fileIndex, 100, file.size, file.size);

    return response.data;
  }

  pause(fileId: string): void {
    const task = this.tasks.get(fileId);
    if (task && task.status === 'uploading') {
      task.status = 'paused';
    }
  }

  resume(fileId: string): void {
    const task = this.tasks.get(fileId);
    if (task && task.status === 'paused') {
      task.status = 'uploading';
    }
  }

  cancel(fileId: string): void {
    const task = this.tasks.get(fileId);
    if (task) {
      task.status = 'cancelled';
      task.controller.abort();
      this.tasks.delete(fileId);
    }
  }

  getTask(fileId: string): UploadTask | undefined {
    return this.tasks.get(fileId);
  }

  getAllTasks(): UploadTask[] {
    return Array.from(this.tasks.values());
  }

  clear(): void {
    this.tasks.forEach((task) => {
      task.controller.abort();
    });
    this.tasks.clear();
  }
}
