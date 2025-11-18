import type { TNullable } from '../../../shared/types/nullable';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  nickname: string;
  avatar?: File;
}

export interface UpdateProfileDto {
  nickname: string;
  avatar?: File;
}

export interface AuthResponse {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: TNullable<string>;
}

export interface CheckNicknameResponse {
  available: boolean;
}
