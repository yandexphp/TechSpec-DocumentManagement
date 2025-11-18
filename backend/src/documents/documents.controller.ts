import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AntivirusService } from '../antivirus/antivirus.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import type { TNullable } from '../common/types/nullable';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DocumentsService } from './documents.service';
import { FilterDocumentsDto } from './dto/filter-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import type { ChunkMetadata } from './interfaces/chunk-metadata.interface';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('accessToken')
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);
  constructor(
    @Inject(DocumentsService) private readonly documentsService: DocumentsService,
    @Inject(FileStorageService) private readonly fileStorageService: FileStorageService,
    @Inject(FileConverterService) private readonly fileConverterService: FileConverterService,
    @Inject(AntivirusService) private readonly antivirusService: AntivirusService
  ) {}
  @Post()
  @ApiOperation({ summary: 'Загрузить документ' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Документ успешно загружен',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        originalName: { type: 'string', example: 'document.pdf' },
        mimeType: { type: 'string', example: 'application/pdf' },
        size: { type: 'number', example: 1024 },
        fileURL: { type: 'string', example: 'http://example.com/file.pdf' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Превышен размер файла или файл заражен вирусом' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1024 ** 3,
      },
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File | null | undefined,
    @CurrentUser() user: RequestUser
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const MAX_FILE_SIZE = 1024 ** 3;
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 ** 2}MB`
      );
    }
    await this.antivirusService.scanFile(file.buffer, file.originalname);
    const { filePath } = await this.fileStorageService.uploadFile(file, user.userId);
    const document = await this.documentsService.create(
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        filePath,
        fileURL: filePath,
        isPrivate: true,
      },
      user.userId
    );
    return {
      ...document,
      size: Number(document.size),
    };
  }
  @Get()
  @ApiOperation({ summary: 'Получить список документов с фильтрацией и пагинацией' })
  @ApiResponse({
    status: 200,
    description: 'Список документов',
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              originalName: { type: 'string' },
              mimeType: { type: 'string' },
              size: { type: 'number' },
              fileURL: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              userId: { type: 'string' },
              authorNickname: { type: 'string', nullable: true },
            },
          },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async findAll(@Query() filterDto: FilterDocumentsDto, @CurrentUser() user: RequestUser) {
    try {
      const result = await this.documentsService.findAll(filterDto, user.userId);
      return {
        ...result,
        documents: result.documents.map((doc) => {
          const docWithUser = doc as typeof doc & { user?: TNullable<{ nickname: string }> };
          const { user: _user, ...documentWithoutUser } = docWithUser;
          return {
            ...documentWithoutUser,
            size: typeof doc.size === 'bigint' ? Number(doc.size) : doc.size,
            userId: doc.userId,
            authorNickname: docWithUser.user?.nickname || null,
          };
        }),
      };
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }
  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о документе по ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID документа',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о документе',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        originalName: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        fileURL: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Документ не найден' })
  async findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid document ID format');
    }
    const document = await this.documentsService.findOne(id, user.userId);
    const documentWithUser = document as typeof document & {
      user?: TNullable<{ nickname: string }>;
    };
    const { user: _documentUser, ...documentWithoutUser } = documentWithUser;
    return {
      ...documentWithoutUser,
      size: Number(document.size),
      authorNickname: documentWithUser.user?.nickname || null,
    };
  }
  @Get(':id/file')
  @ApiOperation({ summary: 'Получить файл документа (просмотр или скачивание)' })
  @ApiParam({
    name: 'id',
    description: 'UUID документа',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'download',
    required: false,
    description: 'Скачать файл (true) или просмотреть (false)',
    example: 'false',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    description: 'Ширина изображения (для изображений)',
    example: '800',
  })
  @ApiQuery({
    name: 'height',
    required: false,
    description: 'Высота изображения (для изображений)',
    example: '600',
  })
  @ApiQuery({
    name: 'quality',
    required: false,
    description: 'Качество изображения (для изображений)',
    example: '80',
  })
  @ApiResponse({
    status: 200,
    description: 'Файл успешно получен',
    content: { 'application/octet-stream': {} },
  })
  @ApiResponse({ status: 304, description: 'Файл не изменился (ETag)' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Документ не найден' })
  async getFile(
    @Param('id') id: string,
    @Query('download') download: string,
    @Query('width') width: string,
    @Query('height') height: string,
    @Query('quality') _quality: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
    @Req() req: Request
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid document ID format');
    }
    const document = await this.documentsService.findOne(id, user.userId);
    let fileBuffer = await this.documentsService.getFileBuffer(id, user.userId);
    let mimeType = document.mimeType;
    let fileName = document.originalName;
    if (this.fileConverterService.isConvertible(document.mimeType)) {
      try {
        fileBuffer = await this.fileConverterService.convertToPdf(fileBuffer, document.mimeType);
        mimeType = 'application/pdf';
        fileName = `${document.originalName.replace(/\.[^/.]+$/, '')}.pdf`;
        this.logger.log(`Converted ${document.mimeType} to PDF for document ${id}`);
      } catch (error) {
        this.logger.error(`Failed to convert file to PDF: ${error.message}`);
        throw new BadRequestException('Failed to convert file to PDF');
      }
    }
    const isImage = mimeType.startsWith('image/');
    const disposition = download === 'true' ? 'attachment' : 'inline';
    const etag = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${etag}"`) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(fileName)}"`
    );
    if (isImage && disposition === 'inline') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('ETag', `"${etag}"`);
      res.setHeader('Last-Modified', document.createdAt.toUTCString());
      if (width || height) {
        res.setHeader('X-Image-Optimization', 'requested');
      }
    } else {
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('ETag', `"${etag}"`);
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.send(fileBuffer);
  }
  @Post('chunk')
  @ApiOperation({ summary: 'Загрузить chunk файла (для больших файлов)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Chunk успешно загружен',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        chunkIndex: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @UploadedFile() chunk: Express.Multer.File | null | undefined,
    @Body() body: {
      fileId?: string;
      chunkIndex?: string;
      totalChunks?: string;
      fileName?: string;
      mimeType?: string;
    },
    @CurrentUser() user: RequestUser
  ) {
    if (!chunk) {
      throw new BadRequestException('Chunk is required');
    }
    const fileId = body.fileId;
    if (!body.chunkIndex) {
      throw new BadRequestException('chunkIndex is required');
    }
    if (!body.totalChunks) {
      throw new BadRequestException('totalChunks is required');
    }
    const chunkIndex = parseInt(body.chunkIndex, 10);
    const totalChunks = parseInt(body.totalChunks, 10);
    const fileName = body.fileName;
    const mimeType = body.mimeType;
    if (!fileId || typeof fileId !== 'string' || fileId.length === 0 || fileId.length > 255) {
      throw new BadRequestException('Invalid fileId');
    }
    if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
      throw new BadRequestException('Invalid chunkIndex');
    }
    if (Number.isNaN(totalChunks) || totalChunks < 1 || totalChunks > 1000) {
      throw new BadRequestException('Invalid totalChunks');
    }
    if (
      !fileName ||
      typeof fileName !== 'string' ||
      fileName.length === 0 ||
      fileName.length > 255
    ) {
      throw new BadRequestException('Invalid fileName');
    }
    if (!mimeType || typeof mimeType !== 'string') {
      throw new BadRequestException('Invalid mimeType');
    }
    if (chunkIndex >= totalChunks) {
      throw new BadRequestException('Chunk index exceeds total chunks');
    }
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new BadRequestException('Invalid file name');
    }
    if (!/^[0-9a-zA-Z_-]+$/.test(fileId)) {
      throw new BadRequestException('Invalid file ID format');
    }
    const sanitizedFileId = fileId.replace(/[^0-9a-zA-Z_-]/gi, '');
    const tempDir = path.join(os.tmpdir(), 'documents-chunks', user.userId, sanitizedFileId);
    await fs.mkdir(tempDir, { recursive: true });
    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
    await fs.writeFile(chunkPath, chunk.buffer);
    const metadata: ChunkMetadata = {
      fileName,
      mimeType,
      totalChunks,
      userId: user.userId,
    };
    await fs.writeFile(path.join(tempDir, 'metadata.json'), JSON.stringify(metadata));
    return { success: true, chunkIndex };
  }
  @Post('chunk/:fileId/finalize')
  @ApiOperation({ summary: 'Завершить загрузку файла по частям' })
  @ApiParam({
    name: 'fileId',
    description: 'ID файла для финализации',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Файл успешно собран и загружен',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        originalName: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        fileURL: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ошибка при финализации' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async finalizeChunkedUpload(@Param('fileId') fileId: string, @CurrentUser() user: RequestUser) {
    if (!fileId || typeof fileId !== 'string' || fileId.length === 0 || fileId.length > 255) {
      throw new BadRequestException('Invalid fileId');
    }
    if (!/^[0-9a-zA-Z_-]+$/.test(fileId)) {
      throw new BadRequestException('Invalid file ID format');
    }
    const sanitizedFileId = fileId.replace(/[^0-9a-zA-Z_-]/gi, '');
    const tempDir = path.join(os.tmpdir(), 'documents-chunks', user.userId, sanitizedFileId);
    const metadataPath = path.join(tempDir, 'metadata.json');
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata: ChunkMetadata = JSON.parse(metadataContent);
      const chunks: Buffer[] = [];
      for (let i = 0; i < metadata.totalChunks; i++) {
        const chunkPath = path.join(tempDir, `chunk-${i}`);
        const chunkBuffer = await fs.readFile(chunkPath);
        chunks.push(chunkBuffer);
      }
      const completeFile = Buffer.concat(chunks);
      await this.antivirusService.scanFile(completeFile, metadata.fileName);
      const tempFilePath = path.join(tempDir, metadata.fileName);
      await fs.writeFile(tempFilePath, completeFile);
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: metadata.fileName,
        encoding: '7bit',
        mimetype: metadata.mimeType,
        size: completeFile.length,
        buffer: completeFile,
        destination: tempDir,
        filename: metadata.fileName,
        path: tempFilePath,
        stream: Readable.from(completeFile),
      };
      const { filePath } = await this.fileStorageService.uploadFile(file, user.userId);
      const document = await this.documentsService.create(
        {
          originalName: metadata.fileName,
          mimeType: metadata.mimeType,
          size: completeFile.length,
          filePath,
          fileURL: filePath,
          isPrivate: true,
        },
        user.userId
      );
      await fs.rm(tempDir, { recursive: true, force: true });
      return {
        ...document,
        size: Number(document.size),
      };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      this.logger.error(`Failed to finalize chunked upload: ${error.message}`);
      throw new BadRequestException('Failed to finalize chunked upload');
    }
  }
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOperation({ summary: 'Обновить документ' })
  @ApiParam({
    name: 'id',
    description: 'UUID документа',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Документ успешно обновлен',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Документ не найден' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateDocumentDto
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid document ID format');
    }
    const document = await this.documentsService.update(id, user.userId, updateDto);
    return {
      ...document,
      size: Number(document.size),
    };
  }
  @Patch('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Массовое обновление документов' })
  @ApiResponse({
    status: 200,
    description: 'Документы успешно обновлены',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Некоторые документы не найдены' })
  async updateMany(
    @CurrentUser() user: RequestUser,
    @Body() body: { ids: string[]; isPrivate?: boolean }
  ) {
    const documents = await this.documentsService.updateMany(user.userId, body.ids, {
      isPrivate: body.isPrivate,
    });
    return documents.map((doc) => ({
      ...doc,
      size: Number(doc.size),
    }));
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Удалить документ (мягкое удаление)' })
  @ApiParam({
    name: 'id',
    description: 'UUID документа',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Документ успешно удален',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Document deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Документ не найден' })
  async remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BadRequestException('Invalid document ID format');
    }
    await this.documentsService.remove(id, user.userId);
    return { message: 'Document deleted successfully' };
  }
}
