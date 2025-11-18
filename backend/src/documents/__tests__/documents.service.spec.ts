import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Document } from '@prisma/client';

import { FileStorageService } from '../../file-storage/file-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { DocumentsService } from '../documents.service';
import type { FilterDocumentsDto } from '../dto/filter-documents.dto';
import { CACHE_SERVICE_TOKEN } from '../interfaces/cache-service.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;
  const mockPrismaService = {
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };
  const mockFileStorageService = {
    getFile: jest.fn(),
  };
  const mockWebSocketGateway = {
    notifyDocumentUploaded: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_SERVICE_TOKEN,
          useValue: mockCacheService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: WebSocketGateway,
          useValue: mockWebSocketGateway,
        },
      ],
    }).compile();
    service = module.get<DocumentsService>(DocumentsService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('create', () => {
    it('should create a document', async () => {
      const createDto = {
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        filePath: '/test.pdf',
        fileURL: 'http://example.com/file.pdf',
      };
      const userId = 'user-1';
      const document: Document = {
        id: 'doc-1',
        originalName: createDto.originalName,
        mimeType: createDto.mimeType,
        size: BigInt(1024),
        filePath: createDto.filePath,
        fileURL: createDto.fileURL,
        userId,
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
      };
      mockPrismaService.document.create.mockResolvedValue(document);
      mockCacheService.deletePattern.mockResolvedValue(undefined);
      const result = await service.create(createDto, userId);
      expect(result).toEqual(document);
      expect(mockPrismaService.document.create).toHaveBeenCalled();
      expect(mockWebSocketGateway.notifyDocumentUploaded).toHaveBeenCalledWith(userId, document);
    });
  });
  describe('findOne', () => {
    it('should return a document', async () => {
      const document: Document = {
        id: 'doc-1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: '/test.pdf',
        fileURL: 'http://example.com/file.pdf',
        userId: 'user-1',
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
      };
      mockPrismaService.document.findFirst.mockResolvedValue(document);
      const result = await service.findOne('doc-1', 'user-1');
      expect(result).toEqual(document);
    });
    it('should throw NotFoundException if document not found', async () => {
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      await expect(service.findOne('doc-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
  describe('remove', () => {
    it('should soft delete document', async () => {
      const id = 'doc-1';
      const userId = 'user-1';
      const document: Document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: '/test.pdf',
        fileURL: 'http://example.com/file.pdf',
        userId,
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
      };
      mockPrismaService.document.findFirst.mockResolvedValue(document);
      mockPrismaService.document.update.mockResolvedValue({
        ...document,
        deletedAt: new Date(),
      });
      mockCacheService.deletePattern.mockResolvedValue(undefined);
      await service.remove(id, userId);
      expect(mockPrismaService.document.update).toHaveBeenCalledWith({
        where: { id },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith(`documents:${userId}:*`);
    });
    it('should throw NotFoundException if document not found', async () => {
      const id = 'doc-1';
      const userId = 'user-1';
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      await expect(service.remove(id, userId)).rejects.toThrow(NotFoundException);
    });
  });
  describe('getFileBuffer', () => {
    it('should return file buffer', async () => {
      const id = 'doc-1';
      const userId = 'user-1';
      const document: Document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        filePath: 'user-1/file.pdf',
        fileURL: 'http://example.com/file.pdf',
        userId,
        isPrivate: false,
        createdAt: new Date(),
        deletedAt: null,
      };
      const fileBuffer = Buffer.from('test content');
      mockPrismaService.document.findFirst.mockResolvedValue(document);
      mockFileStorageService.getFile.mockResolvedValue(fileBuffer);
      const result = await service.getFileBuffer(id, userId);
      expect(result).toEqual(fileBuffer);
      expect(mockFileStorageService.getFile).toHaveBeenCalledWith(document.filePath);
    });
    it('should throw NotFoundException if document not found', async () => {
      const id = 'doc-1';
      const userId = 'user-1';
      mockPrismaService.document.findFirst.mockResolvedValue(null);
      await expect(service.getFileBuffer(id, userId)).rejects.toThrow(NotFoundException);
    });
  });
  describe('findAll', () => {
    it('should return cached result if available', async () => {
      const filterDto: FilterDocumentsDto = { page: 1, limit: 10, onlyMine: true };
      const userId = 'user-1';
      const cached = {
        documents: [] as Array<Omit<Document, 'size'> & { size: string }>,
        total: 0,
        page: 1,
        limit: 10,
      };
      mockCacheService.get.mockResolvedValue(cached);
      const result = await service.findAll(filterDto, userId);
      expect(result.documents).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockPrismaService.document.findMany).not.toHaveBeenCalled();
    });
    it('should fetch from database and cache if not cached', async () => {
      const filterDto: FilterDocumentsDto = { page: 1, limit: 10, onlyMine: true };
      const userId = 'user-1';
      const documents: Document[] = [
        {
          id: 'doc-1',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: BigInt(1024),
          filePath: '/test.pdf',
          fileURL: 'http://example.com/file.pdf',
          userId,
          isPrivate: false,
          createdAt: new Date(),
          deletedAt: null,
        },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.document.findMany.mockResolvedValue(documents);
      mockPrismaService.document.count.mockResolvedValue(1);
      mockCacheService.set.mockResolvedValue(undefined);
      const result = await service.findAll(filterDto, userId);
      expect(result.documents).toEqual(documents);
      expect(result.total).toBe(1);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
    it('should filter by name when provided', async () => {
      const filterDto: FilterDocumentsDto = { page: 1, limit: 10, name: 'test' };
      const userId = 'user-1';
      const documents: Document[] = [
        {
          id: 'doc-1',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: BigInt(1024),
          filePath: '/test.pdf',
          fileURL: 'http://example.com/file.pdf',
          userId,
          isPrivate: false,
          createdAt: new Date(),
          deletedAt: null,
        },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.document.findMany.mockResolvedValue(documents);
      mockPrismaService.document.count.mockResolvedValue(1);
      mockCacheService.set.mockResolvedValue(undefined);
      const result = await service.findAll(filterDto, userId);
      expect(result.documents).toEqual(documents);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: expect.objectContaining({
              contains: 'test',
            }),
          }),
        })
      );
    });
    it('should paginate correctly', async () => {
      const filterDto: FilterDocumentsDto = { page: 2, limit: 5 };
      const userId = 'user-1';
      const documents: Document[] = [];
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.document.findMany.mockResolvedValue(documents);
      mockPrismaService.document.count.mockResolvedValue(0);
      mockCacheService.set.mockResolvedValue(undefined);
      const result = await service.findAll(filterDto, userId);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });
  });
});
