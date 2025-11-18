import * as crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptJWT, jwtDecrypt } from 'jose';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { ITokenService } from '../interfaces/token-service.interface';

@Injectable()
export class TokenService implements ITokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly secretKey: Uint8Array;
  private readonly accessTokenExpiration = '15m';
  private readonly refreshTokenExpiration = '7d';

  constructor(
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    const secret = this.configService.get<string>(
      'JWT_SECRET',
      'your-secret-key-change-in-production'
    );
    const hash = crypto.createHash('sha256').update(secret).digest();
    this.secretKey = new Uint8Array(hash);
  }

  async generateTokens(
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionId = randomUUID();
    const payload = { sub: userId, email, sessionId };

    const accessToken = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime(this.accessTokenExpiration)
      .encrypt(this.secretKey);

    const refreshToken = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime(this.refreshTokenExpiration)
      .encrypt(this.secretKey);

    const sessionKey = `session:${sessionId}`;
    await this.redisService.set(sessionKey, userId, 7 * 24 * 60 * 60);

    return { accessToken, refreshToken, sessionId };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const { payload } = await jwtDecrypt(refreshToken, this.secretKey);
      const sessionId = payload.sessionId as string;

      if (!sessionId) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const sessionKey = `session:${sessionId}`;
      const userId = await this.redisService.get(sessionKey);

      if (!userId) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const revokedKey = `revoked:${sessionId}`;
      const isRevoked = await this.redisService.get(revokedKey);

      if (isRevoked) {
        throw new UnauthorizedException('Session revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub as string },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { sub: user.id, email: user.email, sessionId };
      const accessToken = await new EncryptJWT(newPayload)
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime(this.accessTokenExpiration)
        .encrypt(this.secretKey);

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token decryption error', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const revokedKey = `revoked:${sessionId}`;
    await this.redisService.set(revokedKey, '1', 7 * 24 * 60 * 60);

    const sessionKey = `session:${sessionId}`;
    await this.redisService.del(sessionKey);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `session:*`;
    const keys = await this.redisService.keys(pattern);

    const sessionIds: string[] = [];
    const getPromises = keys.map(async (key) => {
      const storedUserId = await this.redisService.get(key);
      if (storedUserId === userId) {
        const sessionId = key.replace('session:', '');
        sessionIds.push(sessionId);
      }
    });

    await Promise.all(getPromises);

    await Promise.all(sessionIds.map((sessionId) => this.revokeSession(sessionId)));
  }

  async decryptToken(
    token: string
  ): Promise<{ sub: string; email: string; sessionId: string; iat?: number; exp?: number }> {
    try {
      const { payload } = await jwtDecrypt(token, this.secretKey);
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        sessionId: payload.sessionId as string,
        iat: payload.iat as number,
        exp: payload.exp as number,
      };
    } catch (error) {
      this.logger.error('Token decryption error', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
