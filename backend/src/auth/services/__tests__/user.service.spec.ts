import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import { UserService } from '../user.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('register', () => {
    it('should register a new user with nickname', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const nickname = 'testuser';
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      const user: User = {
        id: 'user-123',
        email,
        password: hashedPassword,
        nickname,
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockPrismaService.user.create.mockResolvedValue(user);
      const result = await service.register(email, password, nickname);
      expect(result).toEqual({
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password: hashedPassword,
          nickname,
          avatarUrl: null,
        },
      });
    });
    it('should register a new user with nickname and avatar', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const nickname = 'testuser';
      const avatarUrl = 'http://example.com/avatar.jpg';
      const hashedPassword = 'hashedPassword';
      const user: User = {
        id: 'user-123',
        email,
        password: hashedPassword,
        nickname,
        avatarUrl,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(user);
      const result = await service.register(email, password, nickname, avatarUrl);
      expect(result).toEqual({
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      });
    });
    it('should throw ConflictException if nickname is taken', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const nickname = 'testuser';
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'other-user',
        nickname,
      });
      await expect(service.register(email, password, nickname)).rejects.toThrow(ConflictException);
    });
    it('should throw ConflictException if user exists', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const nickname = 'testuser';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
      });
      await expect(service.register(email, password, nickname)).rejects.toThrow(ConflictException);
    });
  });
  describe('login', () => {
    it('should login successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user: User = {
        id: 'user-123',
        email,
        password: 'hashedPassword',
        nickname: 'testuser',
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.login(email, password);
      expect(result).toEqual({ userId: user.id, email: user.email });
    });
    it('should throw UnauthorizedException if user not found', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
    it('should throw UnauthorizedException if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const user: User = {
        id: 'user-123',
        email,
        password: 'hashedPassword',
        nickname: 'testuser',
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });
  describe('validateUser', () => {
    it('should return user if found', async () => {
      const userId = 'user-123';
      const user: User = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed',
        nickname: 'testuser',
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      const result = await service.validateUser(userId);
      expect(result).toEqual(user);
    });
    it('should throw UnauthorizedException if user not found', async () => {
      const userId = 'user-123';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser(userId)).rejects.toThrow(UnauthorizedException);
    });
  });
  describe('checkNicknameAvailability', () => {
    it('should return true if nickname is available', async () => {
      const nickname = 'testuser';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const result = await service.checkNicknameAvailability(nickname);
      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { nickname },
      });
    });
    it('should return false if nickname is taken', async () => {
      const nickname = 'testuser';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        nickname,
      });
      const result = await service.checkNicknameAvailability(nickname);
      expect(result).toBe(false);
    });
    it('should return true if nickname is taken by current user', async () => {
      const nickname = 'testuser';
      const excludeUserId = 'user-123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: excludeUserId,
        nickname,
      });
      const result = await service.checkNicknameAvailability(nickname, excludeUserId);
      expect(result).toBe(true);
    });
  });
  describe('updateProfile', () => {
    it('should update nickname', async () => {
      const userId = 'user-123';
      const nickname = 'newuser';
      const user = {
        id: userId,
        email: 'test@example.com',
        nickname: 'olduser',
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      const updatedUser = {
        ...user,
        nickname,
      };
      mockPrismaService.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, nickname);
      expect(result).toEqual({
        userId: updatedUser.id,
        email: updatedUser.email,
        nickname: updatedUser.nickname,
        avatarUrl: updatedUser.avatarUrl,
      });
    });
    it('should update avatarUrl', async () => {
      const userId = 'user-123';
      const nickname = 'testuser';
      const avatarUrl = 'http://example.com/avatar.jpg';
      const user: User = {
        id: userId,
        email: 'test@example.com',
        nickname,
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      const updatedUser = {
        ...user,
        avatarUrl,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, nickname, avatarUrl);
      expect(result.avatarUrl).toBe(avatarUrl);
    });
    it('should throw ConflictException if nickname is taken', async () => {
      const userId = 'user-123';
      const nickname = 'newuser';
      const user = {
        id: userId,
        email: 'test@example.com',
        nickname: 'olduser',
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ id: 'other-user', nickname });
      await expect(service.updateProfile(userId, nickname)).rejects.toThrow(ConflictException);
    });
    it('should throw UnauthorizedException if user not found', async () => {
      const userId = 'user-123';
      const nickname = 'newuser';
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfile(userId, nickname)).rejects.toThrow(UnauthorizedException);
    });
    it('should not check nickname availability if nickname unchanged', async () => {
      const userId = 'user-123';
      const nickname = 'testuser';
      const user: User = {
        id: userId,
        email: 'test@example.com',
        nickname,
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      const updatedUser = {
        ...user,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, nickname);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(result.nickname).toBe(nickname);
    });
    it('should update only avatarUrl when nickname is unchanged', async () => {
      const userId = 'user-123';
      const nickname = 'testuser';
      const avatarUrl = 'http://example.com/avatar.jpg';
      const user: User = {
        id: userId,
        email: 'test@example.com',
        nickname,
        avatarUrl: null,
        password: 'hashed',
        createdAt: new Date(),
      };
      const updatedUser = {
        ...user,
        avatarUrl,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      const result = await service.updateProfile(userId, nickname, avatarUrl);
      expect(result.avatarUrl).toBe(avatarUrl);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ avatarUrl }),
        })
      );
    });
  });
});
