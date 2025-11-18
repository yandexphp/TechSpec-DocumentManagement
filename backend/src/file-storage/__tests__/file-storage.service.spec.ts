import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type * as Minio from 'minio';

import { FileStorageService } from '../file-storage.service';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let _minioClient: Minio.Client;
  let _configService: ConfigService;
  const mockMinioClient = {
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    removeObject: jest.fn(),
    getObject: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'MINIO_BUCKET_NAME') return 'documents';
      if (key === 'MINIO_BASE_URL') return 'http://localhost:9000';
      return defaultValue;
    }),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: 'MINIO_CLIENT',
          useValue: mockMinioClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<FileStorageService>(FileStorageService);
    _minioClient = module.get<Minio.Client>('MINIO_CLIENT');
    _configService = module.get<ConfigService>(ConfigService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test content'),
        size: 12,
      } as Express.Multer.File;
      const userId = 'user-123';
      mockMinioClient.putObject.mockResolvedValue(undefined);
      const result = await service.uploadFile(file, userId);
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileURL');
      expect(result.filePath).toContain(userId);
      expect(result.filePath).toContain('.pdf');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });
  describe('getFileURL', () => {
    it('should return file URL', async () => {
      const fileName = 'user-123/file.pdf';
      const result = service.getFileURL(fileName);
      expect(result).toBe('http://localhost:9000/user-123/file.pdf');
    });
  });
  describe('deleteFile', () => {
    it('should delete file', async () => {
      const filePath = 'user-123/file.pdf';
      mockMinioClient.removeObject.mockResolvedValue(undefined);
      await service.deleteFile(filePath);
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('documents', filePath);
    });
  });
  describe('getFile', () => {
    it('should get file as buffer', async () => {
      const filePath = 'user-123/file.pdf';
      const fileContent = Buffer.from('test content');
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(fileContent), 0);
          } else if (event === 'end') {
            setTimeout(() => callback(), 0);
          }
          return mockStream;
        }),
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream as never);
      const result = await service.getFile(filePath);
      expect(result).toEqual(fileContent);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('documents', filePath);
    });
    it('should handle stream error', async () => {
      const filePath = 'user-123/file.pdf';
      const error = new Error('Stream error');
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(error), 0);
          }
          return mockStream;
        }),
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream as never);
      await expect(service.getFile(filePath)).rejects.toThrow('Stream error');
    });
  });
});
