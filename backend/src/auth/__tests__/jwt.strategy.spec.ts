import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { RedisService } from '../../redis/redis.service';
import { AuthService } from '../auth.service';
import { TOKEN_SERVICE_TOKEN } from '../interfaces/token-service.interface';
import { JwtAuthGuard } from '../jwt.strategy';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
  };

  const mockTokenService = {
    decryptToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: TOKEN_SERVICE_TOKEN,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createExecutionContext = (request: Partial<Request>): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when token is valid from cookies', async () => {
      const token = 'valid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
        user: undefined,
      };

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        sessionId: 'session-id',
      };

      const user = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: null,
      };

      mockTokenService.decryptToken.mockResolvedValue(payload);
      mockRedisService.get.mockResolvedValue(null);
      mockAuthService.validateUser.mockResolvedValue(user);

      const context = createExecutionContext(request);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({ userId: user.id, email: user.email });
      expect(mockTokenService.decryptToken).toHaveBeenCalledWith(token);
      expect(mockRedisService.get).toHaveBeenCalledWith('revoked:session-id');
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('user-id');
    });

    it('should return true when token is valid from Authorization header', async () => {
      const token = 'valid-token';
      const request: Partial<Request> = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      };

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const user = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: null,
      };

      mockTokenService.decryptToken.mockResolvedValue(payload);
      mockAuthService.validateUser.mockResolvedValue(user);

      const context = createExecutionContext(request);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({ userId: user.id, email: user.email });
      expect(mockTokenService.decryptToken).toHaveBeenCalledWith(token);
    });

    it('should throw UnauthorizedException when token is not found', async () => {
      const request: Partial<Request> = {
        cookies: {},
        headers: {},
      };

      const context = createExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Token not found')
      );
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      const token = 'valid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
      };

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        sessionId: 'session-id',
      };

      mockTokenService.decryptToken.mockResolvedValue(payload);
      mockRedisService.get.mockResolvedValue('revoked');

      const context = createExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Session revoked')
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const token = 'valid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
      };

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      mockTokenService.decryptToken.mockResolvedValue(payload);
      mockRedisService.get.mockResolvedValue(null);
      mockAuthService.validateUser.mockResolvedValue(null);

      const context = createExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('User not found')
      );
    });

    it('should throw UnauthorizedException when token decryption fails', async () => {
      const token = 'invalid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
      };

      mockTokenService.decryptToken.mockRejectedValue(new Error('Invalid token'));

      const context = createExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle token without sessionId', async () => {
      const token = 'valid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
        user: undefined,
      };

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };

      const user = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: null,
      };

      mockTokenService.decryptToken.mockResolvedValue(payload);
      mockAuthService.validateUser.mockResolvedValue(user);

      const context = createExecutionContext(request);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should re-throw UnauthorizedException from tokenService', async () => {
      const token = 'invalid-token';
      const request: Partial<Request> = {
        cookies: { accessToken: token },
      };

      const error = new UnauthorizedException('Token expired');
      mockTokenService.decryptToken.mockRejectedValue(error);

      const context = createExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(error);
    });
  });
});
