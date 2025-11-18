import type { User } from '@prisma/client';

import type { TNullable } from '../../common/types/nullable';

export const USER_SERVICE_TOKEN = Symbol('IUserService');

export interface IUserService {
  register(
    email: string,
    password: string,
    nickname: string,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }>;
  login(email: string, password: string): Promise<{ userId: string; email: string }>;
  validateUser(userId: string): Promise<User>;
  checkNicknameAvailability(nickname: string, excludeUserId?: string): Promise<boolean>;
  updateProfile(
    userId: string,
    nickname: string,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }>;
}
