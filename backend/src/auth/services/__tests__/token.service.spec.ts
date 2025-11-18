import * as crypto from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { EncryptJWT } from 'jose';

import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.generateTokens(userId, email);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const sessionId = 'session-123';

      const secret = 'test-secret-key';
      const hash = crypto.createHash('sha256').update(secret).digest();
      const secretKey = new Uint8Array(hash);

      const refreshToken = await new EncryptJWT({ sub: userId, email, sessionId })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .encrypt(secretKey);

      mockRedisService.get.mockResolvedValueOnce(userId).mockResolvedValueOnce(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email,
      } as never);

      const result = await service.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if session expired', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const sessionId = 'session-123';

      const secret = 'test-secret-key';
      const hash = crypto.createHash('sha256').update(secret).digest();
      const secretKey = new Uint8Array(hash);

      const refreshToken = await new EncryptJWT({ sub: userId, email, sessionId })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .encrypt(secretKey);

      mockRedisService.get.mockResolvedValue(null);

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session revoked', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const sessionId = 'session-123';

      const secret = 'test-secret-key';
      const hash = crypto.createHash('sha256').update(secret).digest();
      const secretKey = new Uint8Array(hash);

      const refreshToken = await new EncryptJWT({ sub: userId, email, sessionId })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .encrypt(secretKey);

      mockRedisService.get.mockResolvedValueOnce(userId).mockResolvedValueOnce('1');

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session', async () => {
      const sessionId = 'session-123';

      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await service.revokeSession(sessionId);

      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalled();
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      const userId = 'user-123';
      const sessionKeys = ['session:session-1', 'session:session-2'];

      mockRedisService.keys.mockResolvedValue(sessionKeys);
      mockRedisService.get
        .mockResolvedValueOnce(userId)
        .mockResolvedValueOnce(userId)
        .mockResolvedValueOnce('other-user');
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(undefined);

      await service.revokeAllUserSessions(userId);

      expect(mockRedisService.keys).toHaveBeenCalledWith('session:*');
      expect(mockRedisService.set).toHaveBeenCalledTimes(2);
      expect(mockRedisService.del).toHaveBeenCalledTimes(2);
    });

    it('should handle empty session list', async () => {
      const userId = 'user-123';

      mockRedisService.keys.mockResolvedValue([]);

      await service.revokeAllUserSessions(userId);

      expect(mockRedisService.keys).toHaveBeenCalledWith('session:*');
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('decryptToken', () => {
    it('should decrypt valid token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const sessionId = 'session-123';

      const secret = 'test-secret-key';
      const hash = crypto.createHash('sha256').update(secret).digest();
      const secretKey = new Uint8Array(hash);

      const token = await new EncryptJWT({ sub: userId, email, sessionId })
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .encrypt(secretKey);

      const result = await service.decryptToken(token);

      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('sessionId');
      expect(result.sub).toBe(userId);
      expect(result.email).toBe(email);
      expect(result.sessionId).toBe(sessionId);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      await expect(service.decryptToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });
});
