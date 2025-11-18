import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AuthService } from '../auth.service';
import { TOKEN_SERVICE_TOKEN } from '../interfaces/token-service.interface';
import { USER_SERVICE_TOKEN } from '../interfaces/user-service.interface';

describe('AuthService', () => {
  let service: AuthService;
  let _userService: typeof mockUserService;
  let _tokenService: typeof mockTokenService;
  const mockUserService = {
    register: jest.fn(),
    login: jest.fn(),
    validateUser: jest.fn(),
    checkNicknameAvailability: jest.fn(),
    updateProfile: jest.fn(),
  };
  const mockTokenService = {
    generateTokens: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    decryptToken: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: USER_SERVICE_TOKEN,
          useValue: mockUserService,
        },
        {
          provide: TOKEN_SERVICE_TOKEN,
          useValue: mockTokenService,
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    _userService = module.get(USER_SERVICE_TOKEN);
    _tokenService = module.get(TOKEN_SERVICE_TOKEN);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const user = { userId: '1', email: registerDto.email, nickname: 'testuser', avatarUrl: null };
      mockUserService.register.mockResolvedValue(user);
      const result = await service.register(registerDto);
      expect(result).toEqual(user);
      expect(mockUserService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.nickname,
        undefined
      );
    });
    it('should register a new user with avatar', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      const avatarUrl = 'http://example.com/avatar.jpg';
      const user = { userId: '1', email: registerDto.email, nickname: 'testuser', avatarUrl };
      mockUserService.register.mockResolvedValue(user);
      const result = await service.register(registerDto, avatarUrl);
      expect(result).toEqual(user);
      expect(mockUserService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.nickname,
        avatarUrl
      );
    });
    it('should throw ConflictException if user exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'testuser',
      };
      mockUserService.register.mockRejectedValue(new ConflictException('User already exists'));
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });
  describe('login', () => {
    it('should login successfully', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = { userId: '1', email: loginDto.email };
      mockUserService.login.mockResolvedValue(user);
      const result = await service.login(loginDto);
      expect(result).toEqual(user);
      expect(mockUserService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password);
    });
    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      mockUserService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
  describe('generateTokens', () => {
    it('should generate tokens', async () => {
      const userId = '1';
      const email = 'test@example.com';
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-1',
      };
      mockTokenService.generateTokens.mockResolvedValue(tokens);
      const result = await service.generateTokens(userId, email);
      expect(result).toEqual(tokens);
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(userId, email);
    });
  });
  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const refreshToken = 'refresh-token';
      const result = { accessToken: 'new-access-token' };
      mockTokenService.refreshAccessToken.mockResolvedValue(result);
      const response = await service.refreshAccessToken(refreshToken);
      expect(response).toEqual(result);
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
    });
  });
  describe('validateUser', () => {
    it('should validate user', async () => {
      const userId = '1';
      const user = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed',
        nickname: null,
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockUserService.validateUser.mockResolvedValue(user);
      const result = await service.validateUser(userId);
      expect(result).toEqual(user);
      expect(mockUserService.validateUser).toHaveBeenCalledWith(userId);
    });
  });
  describe('checkNicknameAvailability', () => {
    it('should check nickname availability', async () => {
      const nickname = 'testuser';
      mockUserService.checkNicknameAvailability.mockResolvedValue(true);
      const result = await service.checkNicknameAvailability(nickname);
      expect(result).toBe(true);
      expect(mockUserService.checkNicknameAvailability).toHaveBeenCalledWith(nickname, undefined);
    });
    it('should check nickname availability with excludeUserId', async () => {
      const nickname = 'testuser';
      const excludeUserId = 'user-123';
      mockUserService.checkNicknameAvailability.mockResolvedValue(true);
      const result = await service.checkNicknameAvailability(nickname, excludeUserId);
      expect(result).toBe(true);
      expect(mockUserService.checkNicknameAvailability).toHaveBeenCalledWith(
        nickname,
        excludeUserId
      );
    });
  });
  describe('updateProfile', () => {
    it('should update profile', async () => {
      const userId = 'user-123';
      const updateDto = { nickname: 'newuser' };
      const updatedUser = {
        userId,
        email: 'test@example.com',
        nickname: 'newuser',
        avatarUrl: null,
      };
      mockUserService.updateProfile.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, updateDto);
      expect(result).toEqual(updatedUser);
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto.nickname,
        undefined
      );
    });
    it('should update profile with avatar', async () => {
      const userId = 'user-123';
      const updateDto = { nickname: 'testuser' };
      const avatarUrl = 'http://example.com/avatar.jpg';
      const updatedUser = {
        userId,
        email: 'test@example.com',
        nickname: 'testuser',
        avatarUrl,
      };
      mockUserService.updateProfile.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, updateDto, avatarUrl);
      expect(result).toEqual(updatedUser);
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        userId,
        updateDto.nickname,
        avatarUrl
      );
    });
  });
  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions', async () => {
      const userId = 'user-123';
      mockTokenService.revokeAllUserSessions.mockResolvedValue(undefined);
      await service.revokeAllUserSessions(userId);
      expect(mockTokenService.revokeAllUserSessions).toHaveBeenCalledWith(userId);
    });
  });
});
