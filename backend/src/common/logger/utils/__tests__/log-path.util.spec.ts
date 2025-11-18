import * as fs from 'node:fs';
import * as path from 'node:path';

import { getDateFolder, getLogFilePath } from '../log-path.util';

jest.mock('node:fs');
jest.mock('node:path');

describe('log-path.util', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    mockPath.join.mockImplementation((...paths) => paths.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDateFolder', () => {
    it('should return date folder in DD-MM-YYYY format', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15'));

      const result = getDateFolder();

      expect(result).toBe('15-03-2024');

      jest.useRealTimers();
    });

    it('should pad day and month with zeros', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-05'));

      const result = getDateFolder();

      expect(result).toBe('05-01-2024');

      jest.useRealTimers();
    });
  });

  describe('getLogFilePath', () => {
    it('should return log file path with date folder', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15'));

      mockFs.existsSync.mockReturnValue(true);

      const result = getLogFilePath('server.log', '/logs');

      expect(result).toBe('/logs/15-03-2024/server.log');
      expect(mockPath.join).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should create date directory if it does not exist', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15'));

      mockFs.existsSync.mockReturnValue(false);

      getLogFilePath('server.log', '/logs');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('15-03-2024'), {
        recursive: true,
      });

      jest.useRealTimers();
    });
  });
});
