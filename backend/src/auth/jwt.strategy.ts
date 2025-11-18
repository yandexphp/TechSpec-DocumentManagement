import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import type { TNullable } from '../common/types/nullable';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';
import type { ITokenService } from './interfaces/token-service.interface';
import { TOKEN_SERVICE_TOKEN } from './interfaces/token-service.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    let token: TNullable<string> = null;

    if (request?.cookies?.accessToken) {
      token = request.cookies.accessToken;
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.tokenService.decryptToken(token);

      if (payload.sessionId) {
        const revokedKey = `revoked:${payload.sessionId}`;
        const isRevoked = await this.redisService.get(revokedKey);

        if (isRevoked) {
          throw new UnauthorizedException('Session revoked');
        }
      }

      const user = await this.authService.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = { userId: user.id, email: user.email };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
