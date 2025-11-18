import { Controller, Get, Inject, Param, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from './file-storage.service';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('accessToken')
@ApiBearerAuth('JWT-auth')
export class FilesController {
  constructor(
    private readonly fileStorageService: FileStorageService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get('*path')
  @ApiOperation({ summary: 'Получить файл по пути' })
  @ApiParam({
    name: 'path',
    description: 'Путь к файлу (например, avatars/uuid.jpg или userId/avatars/uuid.jpg)',
    example: 'avatars/992fe0d6-4c97-4895-9abb-e53ca8d31edc.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'Файл успешно получен',
    content: { 'application/octet-stream': {} },
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async getFile(
    @Req() req: Request,
    @Param('path') _filePath: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response
  ) {
    try {
      let decodedPath = '';

      const fullPath = req.path;
      const storagePrefix = '/api/storage/';
      if (fullPath.startsWith(storagePrefix)) {
        const pathAfterPrefix = fullPath.slice(storagePrefix.length);
        decodedPath = decodeURIComponent(pathAfterPrefix);
      } else {
        return res.status(404).json({ message: 'File path not found' });
      }

      if (!decodedPath) {
        return res.status(404).json({ message: 'File path is empty' });
      }

      let actualPath = decodedPath;
      let isAvatar = false;
      let isDocument = false;

      if (decodedPath.includes('/avatars/')) {
        isAvatar = true;
        if (decodedPath.startsWith(`${user.userId}/`)) {
          actualPath = decodedPath;
        } else if (decodedPath.startsWith('avatars/')) {
          const pathWithUserId = `${user.userId}/${decodedPath}`;
          const fileName = decodedPath.split('/').pop() || '';
          const userWithAvatar = await this.prisma.user.findFirst({
            where: {
              OR: [
                { avatarUrl: decodedPath },
                { avatarUrl: pathWithUserId },
                { avatarUrl: { contains: fileName } },
              ],
            },
          });

          if (userWithAvatar?.avatarUrl) {
            actualPath = userWithAvatar.avatarUrl;
          } else {
            actualPath = pathWithUserId;
          }
        } else {
          actualPath = decodedPath;
        }
      } else if (decodedPath.startsWith(`${user.userId}/`)) {
        actualPath = decodedPath;
        if (decodedPath.includes('/documents/')) {
          isDocument = true;
        }
      } else if (decodedPath.startsWith('avatars/')) {
        const pathWithUserId = `${user.userId}/${decodedPath}`;
        const fileName = decodedPath.split('/').pop() || '';
        const userWithAvatar = await this.prisma.user.findFirst({
          where: {
            OR: [
              { avatarUrl: decodedPath },
              { avatarUrl: pathWithUserId },
              { avatarUrl: { contains: fileName } },
            ],
          },
        });

        if (userWithAvatar?.avatarUrl) {
          actualPath = userWithAvatar.avatarUrl;
        } else {
          actualPath = pathWithUserId;
        }
        isAvatar = true;
      } else if (decodedPath.startsWith('documents/')) {
        isDocument = true;

        const document = await this.prisma.document.findFirst({
          where: {
            OR: [{ filePath: decodedPath }, { fileURL: decodedPath }],
            deletedAt: null,
          },
        });

        if (!document) {
          return res.status(404).json({ message: 'File not found' });
        }

        if (document.isPrivate && document.userId !== user.userId) {
          return res.status(404).json({ message: 'File not found' });
        }

        actualPath = document.filePath;
      } else {
        const document = await this.prisma.document.findFirst({
          where: {
            OR: [{ filePath: decodedPath }, { fileURL: decodedPath }],
            deletedAt: null,
          },
        });

        if (document) {
          isDocument = true;

          if (document.isPrivate && document.userId !== user.userId) {
            return res.status(404).json({ message: 'File not found' });
          }
          actualPath = document.filePath;
        } else {
          actualPath = `${user.userId}/${decodedPath}`;
          isAvatar = true;
        }
      }

      if (isDocument && !isAvatar) {
        const document = await this.prisma.document.findFirst({
          where: {
            filePath: actualPath,
            deletedAt: null,
          },
        });

        if (!document) {
          return res.status(404).json({ message: 'File not found' });
        }

        if (document.isPrivate && document.userId !== user.userId) {
          return res.status(404).json({ message: 'File not found' });
        }
      }

      const stream = await this.fileStorageService.getFileStream(actualPath);

      const mimeType = this.getMimeType(decodedPath);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      stream.pipe(res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found') || errorMessage.includes('NoSuchKey')) {
        return res.status(404).json({ message: 'File not found' });
      }
      return res.status(500).json({ message: 'Failed to retrieve file' });
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
