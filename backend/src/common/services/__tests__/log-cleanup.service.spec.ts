import * as fs from 'node:fs';
import * as path from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';

import { LogCleanupService } from '../log-cleanup.service';

jest.mock('node:fs');
jest.mock('node:path');

describe('LogCleanupService', () => {
  let service: LogCleanupService;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogCleanupService],
    }).compile();

    service = module.get<LogCleanupService>(LogCleanupService);

    mockPath.join.mockImplementation((...paths) => paths.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should call deleteOldLogs on initialization', () => {
      const deleteOldLogsSpy = jest.spyOn(service, 'deleteOldLogs');
      service.onModuleInit();
      expect(deleteOldLogsSpy).toHaveBeenCalled();
    });
  });

  describe('deleteOldLogs', () => {
    it('should return early if logs directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      service.deleteOldLogs();

      expect(mockFs.readdirSync).not.toHaveBeenCalled();
    });

    it('should delete old log folders', () => {
      const now = new Date();
      const oldDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const oldFolderName = `${String(oldDate.getDate()).padStart(2, '0')}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${oldDate.getFullYear()}`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        {
          isDirectory: () => true,
          name: oldFolderName,
        },
      ] as never);

      service.deleteOldLogs();

      expect(mockFs.rmSync).toHaveBeenCalledWith(expect.stringContaining(oldFolderName), {
        recursive: true,
        force: true,
      });
    });

    it('should not delete recent log folders', () => {
      const now = new Date();
      const recentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const recentFolderName = `${String(recentDate.getDate()).padStart(2, '0')}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${recentDate.getFullYear()}`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        {
          isDirectory: () => true,
          name: recentFolderName,
        },
      ] as never);

      service.deleteOldLogs();

      expect(mockFs.rmSync).not.toHaveBeenCalled();
    });

    it('should skip non-directory entries', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        {
          isDirectory: () => false,
          name: 'file.txt',
        },
      ] as never);

      service.deleteOldLogs();

      expect(mockFs.rmSync).not.toHaveBeenCalled();
    });

    it('should skip folders with invalid date format', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        {
          isDirectory: () => true,
          name: 'invalid-folder',
        },
      ] as never);

      service.deleteOldLogs();

      expect(mockFs.rmSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const loggerSpy = jest.spyOn(
        (service as unknown as { logger: { error: (message: string) => void } }).logger,
        'error'
      );

      service.deleteOldLogs();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete old logs'));
    });
  });

  describe('handleLogCleanup', () => {
    it('should call deleteOldLogs', () => {
      const deleteOldLogsSpy = jest.spyOn(service, 'deleteOldLogs');
      service.handleLogCleanup();
      expect(deleteOldLogsSpy).toHaveBeenCalled();
    });
  });
});
