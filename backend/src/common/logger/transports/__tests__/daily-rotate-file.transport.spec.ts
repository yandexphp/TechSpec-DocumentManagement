import * as path from 'node:path';
import * as winston from 'winston';

import { getDateFolder, getLogFilePath } from '../../utils/log-path.util';
import { DailyRotateFileTransport } from '../daily-rotate-file.transport';

jest.mock('node:path');
jest.mock('../../utils/log-path.util', () => ({
  getDateFolder: jest.fn(),
  getLogFilePath: jest.fn(),
}));

const mockPath = path as jest.Mocked<typeof path>;

describe('DailyRotateFileTransport', () => {
  let transport: DailyRotateFileTransport;
  let mockFileTransport: winston.transports.FileTransportInstance;

  beforeEach(() => {
    mockPath.join.mockImplementation((...paths) => paths.join('/'));
    (getDateFolder as jest.Mock).mockReturnValue('15-03-2024');
    (getLogFilePath as jest.Mock).mockReturnValue('/logs/15-03-2024/server.log');

    mockFileTransport = {
      log: jest.fn((_info, callback) => callback()),
      close: jest.fn(),
    } as never;

    jest.spyOn(winston.transports, 'File').mockImplementation(() => mockFileTransport);

    transport = new DailyRotateFileTransport(
      {
        filename: 'server.log',
      },
      '/logs'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create file transport with correct path', () => {
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: '/logs/15-03-2024/server.log',
        })
      );
    });

    it('should extract base filename from path', () => {
      const _transport2 = new DailyRotateFileTransport(
        {
          filename: '/path/to/file.log',
        },
        '/logs'
      );

      expect(path.basename).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should call file transport log method', (done) => {
      const info = { level: 'info', message: 'test' };

      transport.log(info, () => {
        expect(mockFileTransport.log).toHaveBeenCalledWith(info, expect.any(Function));
        done();
      });
    });

    it('should create new file transport when date changes', (done) => {
      (getDateFolder as jest.Mock)
        .mockReturnValueOnce('15-03-2024')
        .mockReturnValueOnce('16-03-2024');
      (getLogFilePath as jest.Mock)
        .mockReturnValueOnce('/logs/15-03-2024/server.log')
        .mockReturnValueOnce('/logs/16-03-2024/server.log');

      const info = { level: 'info', message: 'test' };

      transport.log(info, () => {
        transport.log(info, () => {
          expect(winston.transports.File).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });

    it('should close old transport when date changes', (done) => {
      (getDateFolder as jest.Mock)
        .mockReturnValueOnce('15-03-2024')
        .mockReturnValueOnce('16-03-2024');
      (getLogFilePath as jest.Mock)
        .mockReturnValueOnce('/logs/15-03-2024/server.log')
        .mockReturnValueOnce('/logs/16-03-2024/server.log');

      const info = { level: 'info', message: 'test' };

      transport.log(info, () => {
        transport.log(info, () => {
          expect(mockFileTransport.close).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('close', () => {
    it('should close file transport', () => {
      transport.close();

      expect(mockFileTransport.close).toHaveBeenCalled();
    });
  });
});
