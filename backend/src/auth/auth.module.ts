import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FileStorageModule } from '../file-storage/file-storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TOKEN_SERVICE_TOKEN } from './interfaces/token-service.interface';
import { USER_SERVICE_TOKEN } from './interfaces/user-service.interface';
import { JwtAuthGuard } from './jwt.strategy';
import { TokenService } from './services/token.service';
import { UserService } from './services/user.service';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule, forwardRef(() => FileStorageModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: USER_SERVICE_TOKEN,
      useClass: UserService,
    },
    {
      provide: TOKEN_SERVICE_TOKEN,
      useClass: TokenService,
    },
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, TOKEN_SERVICE_TOKEN],
})
export class AuthModule {}
