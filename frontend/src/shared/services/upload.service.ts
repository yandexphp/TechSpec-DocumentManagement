import { UploadManager } from '../../features/documents/api/uploadManager';
import { UploadQueue } from '../../features/documents/api/uploadQueue';

class UploadService {
  private readonly uploadManager: UploadManager;
  private readonly uploadQueue: UploadQueue;

  constructor() {
    this.uploadManager = new UploadManager();
    this.uploadQueue = new UploadQueue(this.uploadManager, 1);
  }

  getManager(): UploadManager {
    return this.uploadManager;
  }

  getQueue(): UploadQueue {
    return this.uploadQueue;
  }
}

export const uploadService = new UploadService();
