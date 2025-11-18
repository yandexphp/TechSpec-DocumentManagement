import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { TNullable } from '../../common/types/nullable';
import { PrismaService } from '../../prisma/prisma.service';
import type { IUserService } from '../interfaces/user-service.interface';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(
    email: string,
    password: string,
    nickname: string,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }> {
    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const nicknameExists = await this.checkNicknameAvailability(nickname);
    if (!nicknameExists) {
      throw new ConflictException('Nickname already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        avatarUrl: avatarUrl || null,
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }

  async login(email: string, password: string): Promise<{ userId: string; email: string }> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async checkNicknameAvailability(nickname: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { nickname },
    });

    if (existingUser) {
      if (excludeUserId && existingUser.id === excludeUserId) {
        return true;
      }
      return false;
    }

    return true;
  }

  async updateProfile(
    userId: string,
    nickname: string,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updateData: { nickname?: string; avatarUrl?: TNullable<string> } = {};

    if (nickname !== user.nickname) {
      const isAvailable = await this.checkNicknameAvailability(nickname, userId);
      if (!isAvailable) {
        throw new ConflictException('Nickname already taken');
      }
      updateData.nickname = nickname;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    this.logger.log(`Profile updated for user: ${updatedUser.email}`);

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      avatarUrl: updatedUser.avatarUrl,
    };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
