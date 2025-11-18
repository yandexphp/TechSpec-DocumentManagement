import { Readable } from 'node:stream';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

import { FileStorageService } from '../../file-storage/file-storage.service';
import { RedisService } from '../../redis/redis.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { TOKEN_SERVICE_TOKEN } from '../interfaces/token-service.interface';

const createMockFile = (
  content: string | Buffer = 'test content',
  options: {
    originalname?: string;
    mimetype?: string;
    size?: number;
  } = {}
): Express.Multer.File => {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return {
    fieldname: 'file',
    originalname: options.originalname || 'test.pdf',
    encoding: '7bit',
    mimetype: options.mimetype || 'application/pdf',
    size: options.size || buffer.length,
    buffer,
    destination: '/tmp',
    filename: options.originalname || 'test.pdf',
    path: `/tmp/${options.originalname || 'test.pdf'}`,
    stream: Readable.from(buffer),
  };
};
describe('AuthController', () => {
  let controller: AuthController;
  let _authService: AuthService;
  let _tokenService: typeof mockTokenService;
  let _configService: ConfigService;
  let mockResponse: Partial<Response>;
  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    generateTokens: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeSession: jest.fn(),
    checkNicknameAvailability: jest.fn(),
    updateProfile: jest.fn(),
    validateUser: jest.fn(),
  };
  const mockFileStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };
  const mockTokenService = {
    decryptToken: jest.fn(),
  };
  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };
  const createMockConfigService = (nodeEnv: string = 'development') => ({
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'NODE_ENV') return nodeEnv;
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      return defaultValue;
    }),
  });
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  const createMockRequest = (
    body: Record<string, string> = {},
    cookies: Record<string, string> = {}
  ): Request => {
    return {
      body,
      cookies,
    } as Request;
  };
  beforeEach(async () => {
    mockConfigService = createMockConfigService();
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnValue({
        json: jest.fn().mockReturnThis(),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TOKEN_SERVICE_TOKEN,
          useValue: mockTokenService,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
    _authService = module.get<AuthService>(AuthService);
    _tokenService = module.get(TOKEN_SERVICE_TOKEN);
    _configService = module.get<ConfigService>(ConfigService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('register', () => {
    it('should register a new user and set cookies', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const user = {
        userId: 'user-123',
        email: registerDto.email,
        nickname: 'testuser',
        avatarUrl: null,
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      const mockRequest = createMockRequest(registerDto);
      mockAuthService.register.mockResolvedValue(user);
      mockAuthService.generateTokens.mockResolvedValue(tokens);
      await controller.register(mockRequest, undefined, mockResponse as Response);
      expect(mockAuthService.register).toHaveBeenCalled();
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(user.userId, user.email);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      });
    });
    it('should register a new user with avatar', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const user = {
        userId: 'user-123',
        email: registerDto.email,
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      const mockRequest = createMockRequest(registerDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });
      mockFileStorageService.uploadFile.mockResolvedValue({
        filePath: 'user-123/avatars/test.jpg',
      });
      mockAuthService.register.mockResolvedValue(user);
      mockAuthService.updateProfile.mockResolvedValue(user);
      mockAuthService.generateTokens.mockResolvedValue(tokens);
      await controller.register(mockRequest, mockAvatar, mockResponse as Response);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockAvatar,
        user.userId,
        'avatars'
      );
      expect(mockAuthService.register).toHaveBeenCalled();
    });
    it('should throw BadRequestException if avatar is not an image', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const mockRequest = createMockRequest(registerDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'file.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      });
      await expect(
        controller.register(mockRequest, mockAvatar, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if avatar exceeds 15MB', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const mockRequest = createMockRequest(registerDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 16 * 1024 * 1024,
      });
      await expect(
        controller.register(mockRequest, mockAvatar, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw ConflictException if user exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const mockRequest = createMockRequest(registerDto);
      mockAuthService.register.mockRejectedValue(new ConflictException('User already exists'));
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(ConflictException);
    });
    it('should throw BadRequestException if email is missing', async () => {
      const mockRequest = createMockRequest({ password: 'password123', nickname: 'testuser' });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if password is missing', async () => {
      const mockRequest = createMockRequest({ email: 'test@example.com', nickname: 'testuser' });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if nickname is missing', async () => {
      const mockRequest = createMockRequest({ email: 'test@example.com', password: 'password123' });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if password is too short', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: '12345',
        nickname: 'testuser',
      });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if nickname is too short', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'ab',
      });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if nickname is too long', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'a'.repeat(31),
      });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if nickname contains invalid characters', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'test-user!',
      });
      await expect(
        controller.register(mockRequest, undefined, mockResponse as Response)
      ).rejects.toThrow(BadRequestException);
    });
    it('should trim nickname before validation', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: '  testuser  ',
      };
      const user = {
        userId: 'user-123',
        email: registerDto.email,
        nickname: 'testuser',
        avatarUrl: null,
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      const mockRequest = createMockRequest(registerDto);
      mockAuthService.register.mockResolvedValue(user);
      mockAuthService.generateTokens.mockResolvedValue(tokens);
      await controller.register(mockRequest, undefined, mockResponse as Response);
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      });
    });
  });
  describe('login', () => {
    it('should login user and set cookies', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = { userId: 'user-123', email: loginDto.email };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      mockAuthService.login.mockResolvedValue(user);
      mockAuthService.generateTokens.mockResolvedValue(tokens);
      await controller.login(loginDto, mockResponse as Response);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(user.userId, user.email);
      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({ userId: user.userId, email: user.email });
    });
    it('should throw UnauthorizedException if credentials invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await expect(controller.login(loginDto, mockResponse as Response)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshToken = 'refresh-token';
      const newAccessToken = 'new-access-token';
      const mockRequest = createMockRequest({}, { refreshToken });
      mockAuthService.refreshAccessToken.mockResolvedValue({ accessToken: newAccessToken });
      await controller.refresh(mockRequest, mockResponse as Response);
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
    it('should return 401 if refresh token not found', async () => {
      const mockRequest = createMockRequest({}, {});
      const jsonMock = jest.fn().mockReturnThis();
      mockResponse.status = jest.fn().mockReturnValue({ json: jsonMock });
      await controller.refresh(mockRequest, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Refresh token not found' });
    });
    it('should return 401 and clear cookies if refresh token invalid', async () => {
      const refreshToken = 'invalid-token';
      const mockRequest = createMockRequest({}, { refreshToken });
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new UnauthorizedException('Invalid token')
      );
      const jsonMock = jest.fn().mockReturnThis();
      mockResponse.status = jest.fn().mockReturnValue({ json: jsonMock });
      await controller.refresh(mockRequest, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      const accessToken = 'access-token';
      const sessionId = 'session-1';
      const mockRequest = createMockRequest({}, { accessToken, refreshToken: 'refresh-token' });
      mockTokenService.decryptToken.mockResolvedValue({
        sessionId,
        sub: 'user-id',
        email: 'test@example.com',
      });
      mockAuthService.revokeSession.mockResolvedValue(undefined);
      await controller.logout(mockRequest, mockResponse as Response);
      expect(mockTokenService.decryptToken).toHaveBeenCalledWith(accessToken);
      expect(mockAuthService.revokeSession).toHaveBeenCalledWith(sessionId);
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
    it('should logout even if token decryption fails', async () => {
      const mockRequest = createMockRequest({}, { refreshToken: 'refresh-token' });
      mockTokenService.decryptToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      await controller.logout(mockRequest, mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });
  describe('me', () => {
    it('should return user info with nickname and avatarUrl', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        password: 'hashed',
        createdAt: new Date(),
      };
      mockAuthService.validateUser.mockResolvedValue(fullUser);
      const result = await controller.me(user);
      expect(result).toEqual({
        userId: fullUser.id,
        email: fullUser.email,
        nickname: fullUser.nickname,
        avatarUrl: fullUser.avatarUrl,
      });
    });
  });
  describe('checkNickname', () => {
    it('should return available true if nickname is available', async () => {
      const nickname = 'testuser';
      mockAuthService.checkNicknameAvailability.mockResolvedValue(true);
      const result = await controller.checkNickname(nickname);
      expect(result).toEqual({ available: true });
      expect(mockAuthService.checkNicknameAvailability).toHaveBeenCalledWith(nickname, undefined);
    });
    it('should return available false if nickname is taken', async () => {
      const nickname = 'testuser';
      mockAuthService.checkNicknameAvailability.mockResolvedValue(false);
      const result = await controller.checkNickname(nickname);
      expect(result).toEqual({ available: false });
    });
    it('should exclude current user when checking nickname', async () => {
      const nickname = 'testuser';
      const user = { userId: 'user-123', email: 'test@example.com' };
      mockAuthService.checkNicknameAvailability.mockResolvedValue(true);
      await controller.checkNickname(nickname, user);
      expect(mockAuthService.checkNicknameAvailability).toHaveBeenCalledWith(nickname, user.userId);
    });
    it('should throw BadRequestException if nickname is invalid', async () => {
      const nickname = 'ab';
      await expect(controller.checkNickname(nickname)).rejects.toThrow(BadRequestException);
    });
  });
  describe('updateProfile', () => {
    it('should update profile with nickname', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const updateDto = { nickname: 'newuser' };
      const updatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        nickname: 'newuser',
        avatarUrl: null,
      };
      const mockRequest = createMockRequest(updateDto);
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'olduser',
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      mockAuthService.validateUser.mockResolvedValue(fullUser);
      mockAuthService.updateProfile.mockResolvedValue(updatedUser);
      const result = await controller.updateProfile(mockRequest, undefined, user);
      expect(result).toEqual(updatedUser);
      expect(mockAuthService.updateProfile).toHaveBeenCalled();
    });
    it('should update profile with avatar and delete old one', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const updateDto = { nickname: 'testuser' };
      const updatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
      };
      const mockRequest = createMockRequest(updateDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        password: 'hashed',
        createdAt: new Date(),
      };
      mockAuthService.validateUser.mockResolvedValue(fullUser);
      mockFileStorageService.uploadFile.mockResolvedValue({
        filePath: 'user-123/avatars/new.jpg',
      });
      mockAuthService.updateProfile.mockResolvedValue(updatedUser);
      const result = await controller.updateProfile(mockRequest, mockAvatar, user);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalled();
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockAvatar,
        user.userId,
        'avatars'
      );
      expect(result).toEqual(updatedUser);
    });
    it('should handle invalid avatarUrl gracefully when deleting old avatar', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const updateDto = { nickname: 'testuser' };
      const updatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
      };
      const mockRequest = createMockRequest(updateDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'invalid-url',
        password: 'hashed',
        createdAt: new Date(),
      };
      mockAuthService.validateUser.mockResolvedValue(fullUser);
      mockFileStorageService.uploadFile.mockResolvedValue({
        filePath: 'user-123/avatars/new.jpg',
      });
      mockAuthService.updateProfile.mockResolvedValue(updatedUser);
      const result = await controller.updateProfile(mockRequest, mockAvatar, user);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockAvatar,
        user.userId,
        'avatars'
      );
      expect(result).toEqual(updatedUser);
    });
    it('should handle avatarUrl with insufficient path parts', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const updateDto = { nickname: 'testuser' };
      const updatedUser = {
        userId: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
      };
      const mockRequest = createMockRequest(updateDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      });
      const fullUser = {
        id: 'user-123',
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl: 'http://example.com/avatar.jpg',
        password: 'hashed',
        createdAt: new Date(),
      };
      mockAuthService.validateUser.mockResolvedValue(fullUser);
      mockFileStorageService.deleteFile.mockRejectedValue(new Error('Invalid path'));
      mockFileStorageService.uploadFile.mockResolvedValue({
        filePath: 'user-123/avatars/new.jpg',
      });
      mockAuthService.updateProfile.mockResolvedValue(updatedUser);
      const result = await controller.updateProfile(mockRequest, mockAvatar, user);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockAvatar,
        user.userId,
        'avatars'
      );
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
        'http://example.com/avatar.jpg'
      );
      expect(result).toEqual(updatedUser);
    });
    it('should throw BadRequestException if avatar size exceeds limit', async () => {
      const user = { userId: 'user-123', email: 'test@example.com' };
      const updateDto = { nickname: 'testuser' };
      const mockRequest = createMockRequest(updateDto);
      const mockAvatar = createMockFile('test', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 16 * 1024 * 1024,
      });
      await expect(controller.updateProfile(mockRequest, mockAvatar, user)).rejects.toThrow(
        BadRequestException
      );
    });
    it('should set cookies with production settings', async () => {
      mockConfigService = createMockConfigService('production');
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: mockAuthService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: TOKEN_SERVICE_TOKEN,
            useValue: mockTokenService,
          },
          {
            provide: FileStorageService,
            useValue: mockFileStorageService,
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
        ],
      }).compile();
      const prodController = module.get<AuthController>(AuthController);
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const user = {
        userId: 'user-123',
        email: registerDto.email,
        nickname: 'testuser',
        avatarUrl: null,
      };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      const mockRequest = createMockRequest(registerDto);
      mockAuthService.register.mockResolvedValue(user);
      mockAuthService.generateTokens.mockResolvedValue(tokens);
      await prodController.register(mockRequest, undefined, mockResponse as Response);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        tokens.accessToken,
        expect.objectContaining({
          secure: true,
          sameSite: 'none',
          domain: 'localhost',
        })
      );
    });
  });
});
