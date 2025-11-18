import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FileStorageService } from './file-storage.service';
import { FilesController } from './files.controller';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => AuthModule)],
  controllers: [FilesController],
  providers: [
    {
      provide: 'MINIO_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Minio.Client({
          endPoint: configService.get('MINIO_ENDPOINT', 'localhost'),
          port: parseInt(configService.get('MINIO_PORT', '9000'), 10),
          useSSL: configService.get('MINIO_USE_SSL', 'false') === 'true',
          accessKey: configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
          secretKey: configService.get('MINIO_SECRET_KEY', 'minioadmin'),
        });
      },
      inject: [ConfigService],
    },
    FileStorageService,
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}
