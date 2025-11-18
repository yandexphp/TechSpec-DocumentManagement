import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { AntivirusService } from '../../antivirus/antivirus.service';
import type { RequestUser } from '../../auth/interfaces/request-user.interface';
import { JwtAuthGuard } from '../../auth/jwt.strategy';
import { FileConverterService } from '../../file-converter/file-converter.service';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';
import type { FilterDocumentsDto } from '../dto/filter-documents.dto';

jest.mock('node:crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  rm: jest.fn(),
}));

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_3 = '323e4567-e89b-12d3-a456-426614174000';

const createMockFile = (
  content: string | Buffer = 'test content',
  options: {
    originalname?: string;
    mimetype?: string;
    size?: number;
  } = {}
): Express.Multer.File => {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return {
    fieldname: 'file',
    originalname: options.originalname || 'test.pdf',
    encoding: '7bit',
    mimetype: options.mimetype || 'application/pdf',
    size: options.size || buffer.length,
    buffer,
    destination: '/tmp',
    filename: options.originalname || 'test.pdf',
    path: `/tmp/${options.originalname || 'test.pdf'}`,
    stream: Readable.from(buffer),
  };
};
describe('DocumentsController', () => {
  let controller: DocumentsController;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    getFileBuffer: jest.fn(),
  };
  const mockFileStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFile: jest.fn(),
  };
  const mockFileConverterService = {
    isConvertible: jest.fn(),
    convertToPdf: jest.fn(),
  };
  const mockAntivirusService = {
    scanFile: jest.fn(),
  };
  const mockUser: RequestUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };
  beforeEach(async () => {
    mockResponse = {
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnValue({
        end: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      headers: {},
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: FileConverterService,
          useValue: mockFileConverterService,
        },
        {
          provide: AntivirusService,
          useValue: mockAntivirusService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<DocumentsController>(DocumentsController);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = createMockFile('test content', {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      });
      const filePath = 'user-123/file.pdf';
      const fileURL = 'http://example.com/file.pdf';
      const document = {
        id: VALID_UUID,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: BigInt(file.size),
        filePath,
        fileURL,
        userId: mockUser.userId,
        createdAt: new Date(),
        deletedAt: null,
      };
      mockAntivirusService.scanFile.mockResolvedValue(undefined);
      mockFileStorageService.uploadFile.mockResolvedValue({ filePath });
      mockDocumentsService.create.mockResolvedValue(document);
      const result = await controller.uploadFile(file, mockUser);
      expect(mockAntivirusService.scanFile).toHaveBeenCalledWith(file.buffer, file.originalname);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(file, mockUser.userId);
      expect(mockDocumentsService.create).toHaveBeenCalled();
      expect(result.size).toBe(Number(document.size));
    });
    it('should throw BadRequestException if file not provided', async () => {
      await expect(controller.uploadFile(null, mockUser)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if file size exceeds limit', async () => {
      const file = createMockFile(Buffer.alloc(2 * 1024 ** 3), {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 2 * 1024 ** 3,
      });
      await expect(controller.uploadFile(file, mockUser)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if virus detected', async () => {
      const file = createMockFile('malicious content', {
        originalname: 'malicious.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      });
      mockAntivirusService.scanFile.mockRejectedValue(
        new BadRequestException('File is infected with virus')
      );
      await expect(controller.uploadFile(file, mockUser)).rejects.toThrow(BadRequestException);
    });
  });
  describe('findAll', () => {
    it('should return documents list', async () => {
      const filterDto: FilterDocumentsDto = { page: 1, limit: 10 };
      const documents = [
        {
          id: VALID_UUID,
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: BigInt(1024),
          userId: mockUser.userId,
          createdAt: new Date(),
          deletedAt: null,
        },
      ];
      const result = {
        documents,
        total: 1,
        page: 1,
        limit: 10,
      };
      mockDocumentsService.findAll.mockResolvedValue(result);
      const response = await controller.findAll(filterDto, mockUser);
      expect(response.documents).toHaveLength(1);
      expect(response.documents[0].size).toBe(1024);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith(filterDto, mockUser.userId);
    });
  });
  describe('findOne', () => {
    it('should return document', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024),
        userId: mockUser.userId,
        createdAt: new Date(),
        deletedAt: null,
      };
      mockDocumentsService.findOne.mockResolvedValue(document);
      const result = await controller.findOne(id, mockUser);
      expect(result.size).toBe(1024);
      expect(mockDocumentsService.findOne).toHaveBeenCalledWith(id, mockUser.userId);
    });
  });
  describe('remove', () => {
    it('should remove document', async () => {
      const id = VALID_UUID;
      mockDocumentsService.remove.mockResolvedValue(undefined);
      const result = await controller.remove(id, mockUser);
      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(mockDocumentsService.remove).toHaveBeenCalledWith(id, mockUser.userId);
    });
    it('should throw NotFoundException if document not found', async () => {
      const id = VALID_UUID_2;
      mockDocumentsService.remove.mockRejectedValue(new NotFoundException('Document not found'));
      await expect(controller.remove(id, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
  describe('getFile', () => {
    it('should return file buffer', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        filePath: 'user-123/file.pdf',
        createdAt: new Date(),
        userId: mockUser.userId,
      };
      const fileBuffer = Buffer.from('test content');
      mockDocumentsService.findOne.mockResolvedValue(document);
      mockDocumentsService.getFileBuffer.mockResolvedValue(fileBuffer);
      mockFileConverterService.isConvertible.mockReturnValue(false);
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'mock-hash'),
      });
      await controller.getFile(
        id,
        'false',
        '',
        '',
        '',
        mockUser,
        mockResponse as Response,
        mockRequest as Request
      );
      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalledWith(fileBuffer);
    });
    it('should convert file to PDF if convertible', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filePath: 'user-123/file.docx',
        createdAt: new Date(),
        userId: mockUser.userId,
      };
      const originalBuffer = Buffer.from('docx content');
      const pdfBuffer = Buffer.from('pdf content');
      mockDocumentsService.findOne.mockResolvedValue(document);
      mockDocumentsService.getFileBuffer.mockResolvedValue(originalBuffer);
      mockFileConverterService.isConvertible.mockReturnValue(true);
      mockFileConverterService.convertToPdf.mockResolvedValue(pdfBuffer);
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'mock-hash'),
      });
      await controller.getFile(
        id,
        'false',
        '',
        '',
        '',
        mockUser,
        mockResponse as Response,
        mockRequest as Request
      );
      expect(mockFileConverterService.convertToPdf).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalledWith(pdfBuffer);
    });
    it('should return 304 if ETag matches', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        filePath: 'user-123/file.pdf',
        createdAt: new Date(),
        userId: mockUser.userId,
      };
      const fileBuffer = Buffer.from('test content');
      const etag = 'mock-hash';
      const endMock = jest.fn();
      mockDocumentsService.findOne.mockResolvedValue(document);
      mockDocumentsService.getFileBuffer.mockResolvedValue(fileBuffer);
      mockFileConverterService.isConvertible.mockReturnValue(false);
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => etag),
      });
      mockRequest.headers = { 'if-none-match': `"${etag}"` };
      mockResponse.status = jest.fn().mockReturnValue({ end: endMock });
      await controller.getFile(
        id,
        'false',
        '',
        '',
        '',
        mockUser,
        mockResponse as Response,
        mockRequest as Request
      );
      expect(mockResponse.status).toHaveBeenCalledWith(304);
      expect(endMock).toHaveBeenCalled();
    });
    it('should set download disposition when download=true', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        filePath: 'user-123/file.pdf',
        createdAt: new Date(),
        userId: mockUser.userId,
      };
      const fileBuffer = Buffer.from('test content');
      mockDocumentsService.findOne.mockResolvedValue(document);
      mockDocumentsService.getFileBuffer.mockResolvedValue(fileBuffer);
      mockFileConverterService.isConvertible.mockReturnValue(false);
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'mock-hash'),
      });
      mockRequest.headers = {};
      await controller.getFile(
        id,
        'true',
        '',
        '',
        '',
        mockUser,
        mockResponse as Response,
        mockRequest as Request
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
    });
    it('should handle image files with optimization headers', async () => {
      const id = VALID_UUID;
      const document = {
        id,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        filePath: 'user-123/file.jpg',
        createdAt: new Date(),
        userId: mockUser.userId,
      };
      const fileBuffer = Buffer.from('image content');
      mockDocumentsService.findOne.mockResolvedValue(document);
      mockDocumentsService.getFileBuffer.mockResolvedValue(fileBuffer);
      mockFileConverterService.isConvertible.mockReturnValue(false);
      (crypto.createHash as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn(() => 'mock-hash'),
      });
      mockRequest.headers = {};
      await controller.getFile(
        id,
        'false',
        '800',
        '600',
        '80',
        mockUser,
        mockResponse as Response,
        mockRequest as Request
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Image-Optimization', 'requested');
    });
  });
  describe('uploadChunk', () => {
    it('should upload chunk successfully', async () => {
      const chunk = createMockFile('chunk data', {
        originalname: 'chunk.bin',
        mimetype: 'application/octet-stream',
        size: 1024,
      });
      const uploadChunkDto = {
        fileId: VALID_UUID,
        chunkIndex: '0',
        totalChunks: '3',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      const result = await controller.uploadChunk(chunk, uploadChunkDto, mockUser);
      expect(result).toEqual({ success: true, chunkIndex: 0 });
    });
    it('should throw BadRequestException if chunk not provided', async () => {
      const uploadChunkDto = {
        fileId: VALID_UUID,
        chunkIndex: '0',
        totalChunks: '3',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };
      await expect(controller.uploadChunk(null, uploadChunkDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
    it('should throw BadRequestException if chunk index exceeds total chunks', async () => {
      const chunk = createMockFile('chunk data', {
        originalname: 'chunk.bin',
        mimetype: 'application/octet-stream',
        size: 1024,
      });
      const uploadChunkDto = {
        fileId: VALID_UUID,
        chunkIndex: '5',
        totalChunks: '3',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };
      await expect(controller.uploadChunk(chunk, uploadChunkDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
    it('should throw BadRequestException for invalid file name', async () => {
      const chunk = createMockFile('chunk data', {
        originalname: 'chunk.bin',
        mimetype: 'application/octet-stream',
        size: 1024,
      });
      const uploadChunkDto = {
        fileId: VALID_UUID,
        chunkIndex: '0',
        totalChunks: '3',
        fileName: '../../test.pdf',
        mimeType: 'application/pdf',
      };
      await expect(controller.uploadChunk(chunk, uploadChunkDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
    it('should throw BadRequestException for invalid file ID format', async () => {
      const chunk = createMockFile('chunk data', {
        originalname: 'chunk.bin',
        mimetype: 'application/octet-stream',
        size: 1024,
      });
      const uploadChunkDto = {
        fileId: 'invalid-id!@#',
        chunkIndex: '0',
        totalChunks: '3',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
      };
      await expect(controller.uploadChunk(chunk, uploadChunkDto, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
  });
  describe('finalizeChunkedUpload', () => {
    it('should finalize chunked upload successfully', async () => {
      const fileId = '123e4567-e89b-12d3-a456-426614174000';
      const metadata = {
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        totalChunks: 2,
        userId: mockUser.userId,
      };
      const chunk1 = Buffer.from('chunk1');
      const chunk2 = Buffer.from('chunk2');
      const completeFile = Buffer.concat([chunk1, chunk2]);
      const document = {
        id: VALID_UUID_3,
        originalName: metadata.fileName,
        mimeType: metadata.mimeType,
        size: BigInt(completeFile.length),
        filePath: 'user-123/file.pdf',
        fileURL: 'http://example.com/file.pdf',
        userId: mockUser.userId,
        createdAt: new Date(),
        deletedAt: null,
      };
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('metadata.json')) {
          return Promise.resolve(JSON.stringify(metadata));
        }
        if (path.includes('chunk-0')) {
          return Promise.resolve(chunk1);
        }
        if (path.includes('chunk-1')) {
          return Promise.resolve(chunk2);
        }
        return Promise.resolve(Buffer.from(''));
      });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rm as jest.Mock).mockResolvedValue(undefined);
      mockAntivirusService.scanFile.mockResolvedValue(undefined);
      mockFileStorageService.uploadFile.mockResolvedValue({
        filePath: document.filePath,
      });
      mockDocumentsService.create.mockResolvedValue(document);
      const result = await controller.finalizeChunkedUpload(fileId, mockUser);
      expect(mockAntivirusService.scanFile).toHaveBeenCalledWith(completeFile, metadata.fileName);
      expect(mockDocumentsService.create).toHaveBeenCalled();
      expect(result.size).toBe(Number(document.size));
    });
    it('should throw BadRequestException for invalid file ID format', async () => {
      const fileId = 'invalid-id!@#';
      await expect(controller.finalizeChunkedUpload(fileId, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
    it('should handle errors during finalization', async () => {
      const fileId = VALID_UUID;
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.rm as jest.Mock).mockResolvedValue(undefined);
      await expect(controller.finalizeChunkedUpload(fileId, mockUser)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
