import { Module } from '@nestjs/common';

import { AntivirusModule } from '../antivirus/antivirus.module';
import { AuthModule } from '../auth/auth.module';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { RedisModule } from '../redis/redis.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CACHE_SERVICE_TOKEN } from './interfaces/cache-service.interface';
import { CacheService } from './services/cache.service';

@Module({
  imports: [
    AuthModule,
    FileStorageModule,
    FileConverterModule,
    WebSocketModule,
    RedisModule,
    AntivirusModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: CACHE_SERVICE_TOKEN,
      useClass: CacheService,
    },
  ],
})
export class DocumentsModule {}
