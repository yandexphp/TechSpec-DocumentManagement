import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Document, Prisma } from '@prisma/client';

import { FileStorageService } from '../file-storage/file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { FilterDocumentsDto } from './dto/filter-documents.dto';
import { SortField, SortOrder } from './dto/filter-documents.dto';
import type { ICacheService } from './interfaces/cache-service.interface';
import { CACHE_SERVICE_TOKEN } from './interfaces/cache-service.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly CACHE_TTL = 60;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cacheService: ICacheService,
    @Inject(FileStorageService) private readonly fileStorageService: FileStorageService,
    @Inject(WebSocketGateway) private readonly websocketGateway: WebSocketGateway
  ) {}
  async create(createDocumentDto: CreateDocumentDto, userId: string): Promise<Document> {
    const savedDocument = await this.prisma.document.create({
      data: {
        originalName: createDocumentDto.originalName,
        mimeType: createDocumentDto.mimeType,
        size: BigInt(createDocumentDto.size),
        filePath: createDocumentDto.filePath,
        fileURL: createDocumentDto.fileURL,
        isPrivate: createDocumentDto.isPrivate ?? true,
        userId,
      },
    });
    this.logger.log(`Document created: ${savedDocument.id}`);
    if (!savedDocument.isPrivate) {
      await this.invalidateAllUsersCache();
    } else {
      await this.invalidateCache(userId);
    }
    this.websocketGateway.notifyDocumentUploaded(userId, savedDocument);
    return savedDocument;
  }
  async findAll(
    filterDto: FilterDocumentsDto,
    userId: string
  ): Promise<{ documents: Document[]; total: number; page: number; limit: number }> {
    this.logger.log(`[SERVICE] findAll called with filterDto: ${JSON.stringify(filterDto)}`);
    this.logger.log(
      `[SERVICE] filterDto.onlyMine=${filterDto.onlyMine}, type=${typeof filterDto.onlyMine}, ===true=${filterDto.onlyMine === true}`
    );
    const cacheKey = this.getCacheKey(filterDto, userId);
    const onlyMine = filterDto.onlyMine === true;
    this.logger.log(`[SERVICE] onlyMine after transformation: ${onlyMine}`);

    this.logger.log(`[CACHE] Attempting to get data from Redis cache...`);
    const cached = await this.cacheService.get<{
      documents: Array<Omit<Document, 'size'> & { size: string }>;
      total: number;
      page: number;
      limit: number;
    }>(cacheKey);

    if (cached) {
      this.logger.log(
        `[CACHE] Cache HIT! Returning ${cached.documents.length} documents from Redis`
      );
      const documents = cached.documents.map((doc) => ({
        ...doc,
        size: BigInt(doc.size),
      })) as Document[];
      return {
        documents,
        total: cached.total,
        page: cached.page,
        limit: cached.limit,
      };
    } else {
      this.logger.log(`[CACHE] Cache MISS! Data not found in Redis, querying database...`);
    }

    const page = filterDto.page || 1;
    const limit = filterDto.limit || 30;
    const skip = (page - 1) * limit;
    const baseWhere: Prisma.DocumentWhereInput = {
      deletedAt: null,
    };
    let where: Prisma.DocumentWhereInput;
    if (onlyMine) {
      if (filterDto.isPrivate !== undefined) {
        where = {
          ...baseWhere,
          OR: [
            { isPrivate: filterDto.isPrivate, userId: { not: userId } },
            { userId, isPrivate: filterDto.isPrivate },
          ],
        };
      } else {
        where = {
          ...baseWhere,
          OR: [
            { isPrivate: true, userId },
            { isPrivate: false, userId },
          ],
        };
      }
    } else {
      if (filterDto.isPrivate !== undefined) {
        where = {
          ...baseWhere,
          OR: [
            { isPrivate: filterDto.isPrivate, userId: { not: userId } },
            { userId, isPrivate: filterDto.isPrivate },
          ],
        };
      } else {
        where = {
          ...baseWhere,
          OR: [{ isPrivate: false }, { userId }],
        };
      }
    }
    if (filterDto.name && filterDto.name.trim() !== '') {
      this.logger.log(`[FILTER] Applying name filter: "${filterDto.name}"`);
      where.originalName = {
        contains: filterDto.name.trim(),
        mode: 'insensitive',
      };
    } else {
      this.logger.log(`[FILTER] No name filter applied, filterDto.name=${filterDto.name}`);
    }
    if (filterDto.mimeType) {
      where.mimeType = {
        contains: filterDto.mimeType,
        mode: 'insensitive',
      };
    }
    if (filterDto.minSize !== undefined || filterDto.maxSize !== undefined) {
      where.size = {};
      if (filterDto.minSize !== undefined) {
        where.size.gte = BigInt(filterDto.minSize);
      }
      if (filterDto.maxSize !== undefined) {
        where.size.lte = BigInt(filterDto.maxSize);
      }
    }
    const sortFieldMap: Record<SortField, string> = {
      [SortField.CREATED_AT]: 'createdAt',
      [SortField.ORIGINAL_NAME]: 'originalName',
      [SortField.MIME_TYPE]: 'mimeType',
      [SortField.IS_PRIVATE]: 'isPrivate',
      [SortField.SIZE]: 'size',
    };
    const sortField = sortFieldMap[filterDto.sortBy || SortField.CREATED_AT];
    const sortOrder = (filterDto.sortOrder || SortOrder.DESC) as string;
    this.logger.debug(`Sorting by: ${sortField}, order: ${sortOrder}`);
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };
    this.logger.debug(`Where clause: ${JSON.stringify(where, null, 2)}`);
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);
    this.logger.log(`[DB] Found ${documents.length} documents from database, total: ${total}`);
    documents.forEach((doc) => {
      this.logger.debug(
        `Document: id=${doc.id}, userId=${doc.userId}, isPrivate=${doc.isPrivate}, originalName=${doc.originalName}`
      );
    });
    const serializableDocuments = documents.map((doc) => ({
      ...doc,
      size: doc.size.toString(),
    }));
    const result = {
      documents: serializableDocuments,
      total,
      page,
      limit,
    };
    this.logger.log(
      `[CACHE] Saving ${documents.length} documents to Redis cache with TTL ${this.CACHE_TTL}s...`
    );
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    this.logger.log(`[CACHE] Successfully saved data to Redis cache with key: ${cacheKey}`);
    return {
      documents,
      total,
      page,
      limit,
    };
  }
  async findOne(id: string, userId: string): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ userId }, { isPrivate: false }],
      },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }
  async remove(id: string, userId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or access denied`);
    }
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Document soft deleted: ${id}`);
    await this.invalidateCache(userId);
  }
  async getFileBuffer(id: string, userId: string): Promise<Buffer> {
    const document = await this.findOne(id, userId);
    return this.fileStorageService.getFile(document.filePath);
  }
  async update(id: string, userId: string, updateData: { isPrivate?: boolean }): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found or access denied`);
    }
    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...(updateData.isPrivate !== undefined && { isPrivate: updateData.isPrivate }),
      },
    });
    this.logger.log(`Document updated: ${id}`);
    if (updateData.isPrivate !== undefined && document.isPrivate !== updateData.isPrivate) {
      await this.invalidateAllUsersCache();
    } else {
      await this.invalidateCache(userId);
    }
    return updatedDocument;
  }
  async updateMany(
    userId: string,
    ids: string[],
    updateData: { isPrivate?: boolean }
  ): Promise<Document[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
    });
    if (documents.length !== ids.length) {
      throw new NotFoundException('Some documents not found or access denied');
    }
    const privacyChanged =
      updateData.isPrivate !== undefined &&
      documents.some((doc) => doc.isPrivate !== updateData.isPrivate);
    const updatedDocuments = await this.prisma.document.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: {
        ...(updateData.isPrivate !== undefined && { isPrivate: updateData.isPrivate }),
      },
    });
    this.logger.log(`Updated ${updatedDocuments.count} documents`);
    if (privacyChanged) {
      await this.invalidateAllUsersCache();
    } else {
      await this.invalidateCache(userId);
    }
    return this.prisma.document.findMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
    });
  }
  private getCacheKey(filterDto: FilterDocumentsDto, userId: string): string {
    const name = filterDto.name || '';
    const mimeType = filterDto.mimeType || '';
    const isPrivate = filterDto.isPrivate !== undefined ? String(filterDto.isPrivate) : '';
    const minSize = filterDto.minSize || '';
    const maxSize = filterDto.maxSize || '';
    const sortBy = (filterDto.sortBy || SortField.CREATED_AT) as string;
    const sortOrder = filterDto.sortOrder || 'desc';
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 30;
    const onlyMine = filterDto.onlyMine !== undefined ? String(filterDto.onlyMine) : '';
    return `documents:${userId}:${name}:${mimeType}:${isPrivate}:${minSize}:${maxSize}:${sortBy}:${sortOrder}:${page}:${limit}:${onlyMine}`;
  }
  private async invalidateCache(userId: string): Promise<void> {
    const pattern = `documents:${userId}:*`;
    this.logger.log(`[CACHE] Invalidating cache for user ${userId} with pattern: ${pattern}`);
    await this.cacheService.deletePattern(pattern);
    this.logger.log(`[CACHE] Cache invalidated for user ${userId}`);
  }
  private async invalidateAllUsersCache(): Promise<void> {
    const pattern = `documents:*`;
    this.logger.log(`[CACHE] Invalidating cache for all users with pattern: ${pattern}`);
    await this.cacheService.deletePattern(pattern);
    this.logger.log(`[CACHE] Cache invalidated for all users`);
  }
}
