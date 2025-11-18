import * as fs from 'node:fs';

import { createWinstonLogger } from '../winston-logger.factory';

jest.mock('node:fs');
jest.mock('winston', () => ({
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  format: {
    combine: jest.fn((...args) => args),
    colorize: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
  },
}));
jest.mock('nest-winston', () => ({
  WinstonModule: {
    createLogger: jest.fn(),
  },
}));
jest.mock('../../transports/daily-rotate-file.transport', () => ({
  DailyRotateFileTransport: jest.fn(),
}));

describe('createWinstonLogger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create logs directory if it does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    createWinstonLogger('/logs');

    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/logs', { recursive: true });
  });

  it('should not create logs directory if it exists', () => {
    mockFs.existsSync.mockReturnValue(true);

    createWinstonLogger('/logs');

    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should create logger with error and server transports', () => {
    const { WinstonModule } = require('nest-winston');
    const { DailyRotateFileTransport } = require('../../transports/daily-rotate-file.transport');

    createWinstonLogger('/logs');

    expect(DailyRotateFileTransport).toHaveBeenCalledTimes(2);
    expect(WinstonModule.createLogger).toHaveBeenCalled();
  });

  it('should include console transport in non-production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const winston = require('winston');

    createWinstonLogger('/logs');

    expect(winston.transports.Console).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include console transport in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const winston = require('winston');
    const consoleSpy = jest.spyOn(winston.transports, 'Console');

    createWinstonLogger('/logs');

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
