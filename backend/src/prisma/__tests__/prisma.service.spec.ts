import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  const mockConfigService = {
    get: jest.fn<string | undefined, [string]>((key: string) => {
      if (key === 'DATABASE_URL') return 'postgresql://user:password@localhost:5432/testdb';
      return undefined;
    }),
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
  });
  afterEach(async () => {
    jest.clearAllMocks();
    if (service) {
      await service.$disconnect().catch(() => {});
    }
  });
  describe('constructor', () => {
    it('should create service with correct database URL', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
    });
    it('should initialize PrismaClient with correct datasource', () => {
      expect(service).toBeDefined();
      expect(service).toHaveProperty('$connect');
      expect(service).toHaveProperty('$disconnect');
    });
  });
  describe('onModuleInit', () => {
    it('should connect to database and log messages', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Connecting to database...');
      expect(loggerSpy).toHaveBeenCalledWith('Database connected successfully');
      loggerSpy.mockRestore();
    });
    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      const connectSpy = jest.spyOn(service, '$connect').mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Connecting to database...');
      loggerSpy.mockRestore();
    });
  });
  describe('onModuleDestroy', () => {
    it('should disconnect from database and log messages', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Disconnecting from database...');
      expect(loggerSpy).toHaveBeenCalledWith('Database disconnected successfully');
      loggerSpy.mockRestore();
    });
    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockRejectedValue(error);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnect failed');
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Disconnecting from database...');
      loggerSpy.mockRestore();
    });
  });
});
