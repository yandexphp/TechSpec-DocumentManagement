import * as path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { THROTTLER_LIMIT, THROTTLER_TTL_MS } from './common/constants/throttler.constants';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LogCleanupService } from './common/services/log-cleanup.service';
import { DocumentsModule } from './documents/documents.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.join(__dirname, '../../.env'), path.join(__dirname, '../.env')],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: THROTTLER_TTL_MS,
        limit: THROTTLER_LIMIT,
      },
    ]),
    PrismaModule,
    RedisModule,
    FileStorageModule,
    AuthModule,
    DocumentsModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LogCleanupService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
