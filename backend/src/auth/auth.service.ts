import { Inject, Injectable, Logger } from '@nestjs/common';

import type { TNullable } from '../common/types/nullable';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ITokenService } from './interfaces/token-service.interface';
import { TOKEN_SERVICE_TOKEN } from './interfaces/token-service.interface';
import type { IUserService } from './interfaces/user-service.interface';
import { USER_SERVICE_TOKEN } from './interfaces/user-service.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_SERVICE_TOKEN)
    private readonly userService: IUserService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService
  ) {}

  async register(
    registerDto: RegisterDto,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }> {
    this.logger.log(`Registering user: ${registerDto.email}`);
    const result = await this.userService.register(
      registerDto.email,
      registerDto.password,
      registerDto.nickname,
      avatarUrl
    );
    this.logger.log(`User registered successfully: ${result.userId}`);
    return result;
  }

  async checkNicknameAvailability(nickname: string, excludeUserId?: string): Promise<boolean> {
    this.logger.debug(`Checking nickname availability: ${nickname}`);
    const result = await this.userService.checkNicknameAvailability(nickname, excludeUserId);
    this.logger.debug(`Nickname ${nickname} is ${result ? 'available' : 'not available'}`);
    return result;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    avatarUrl?: string
  ): Promise<{ userId: string; email: string; nickname: string; avatarUrl: TNullable<string> }> {
    this.logger.log(`Updating profile for user: ${userId}`);
    const result = await this.userService.updateProfile(
      userId,
      updateProfileDto.nickname,
      avatarUrl
    );
    this.logger.log(`Profile updated successfully for user: ${userId}`);
    return result;
  }

  async login(loginDto: LoginDto): Promise<{ userId: string; email: string }> {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);
    const result = await this.userService.login(loginDto.email, loginDto.password);
    this.logger.log(`User logged in successfully: ${result.userId}`);
    return result;
  }

  async generateTokens(
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    this.logger.debug(`Generating tokens for user: ${userId}`);
    return this.tokenService.generateTokens(userId, email);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    this.logger.debug('Refreshing access token');
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.logger.log(`Revoking session: ${sessionId}`);
    return this.tokenService.revokeSession(sessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    this.logger.log(`Revoking all sessions for user: ${userId}`);
    return this.tokenService.revokeAllUserSessions(userId);
  }

  async validateUser(userId: string) {
    this.logger.debug(`Validating user: ${userId}`);
    return this.userService.validateUser(userId);
  }
}
