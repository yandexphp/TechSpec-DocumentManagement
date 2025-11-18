import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { FileStorageService } from '../file-storage/file-storage.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { RequestUser } from './interfaces/request-user.interface';
import type { ITokenService } from './interfaces/token-service.interface';
import { TOKEN_SERVICE_TOKEN } from './interfaces/token-service.interface';
import { JwtAuthGuard } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: ITokenService,
    @Inject(FileStorageService) private readonly fileStorageService: FileStorageService
  ) {}
  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    if (isProduction) {
      const domain = new URL(frontendUrl).hostname;
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 15 * 60 * 1000,
        domain,
        path: '/',
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain,
        path: '/',
      });
    } else {
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }
  }
  private clearCookies(res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    if (isProduction) {
      const domain = new URL(frontendUrl).hostname;
      res.clearCookie('accessToken', { domain, path: '/' });
      res.clearCookie('refreshToken', { domain, path: '/' });
    } else {
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
    }
  }
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    })
  )
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        nickname: { type: 'string', example: 'username123' },
        avatarUrl: { type: 'string', example: 'http://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким email или никнеймом уже существует',
  })
  async register(
    @Req() req: Request,
    @UploadedFile() avatar: Express.Multer.File | undefined,
    @Res() res: Response
  ) {
    const email = req.body.email;
    const password = req.body.password;
    const nickname = req.body.nickname?.trim();
    if (!email || !password || !nickname) {
      throw new BadRequestException('Email, password and nickname are required');
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (nickname.length < 3 || nickname.length > 30 || !/^[a-zA-Z0-9_]+$/.test(nickname)) {
      throw new BadRequestException(
        'Nickname must be 3-30 characters and contain only letters, numbers, and underscores'
      );
    }
    const registerDto: RegisterDto = {
      email,
      password,
      nickname,
    };
    const user = await this.authService.register(registerDto);
    let avatarUrl: string | undefined;
    if (avatar) {
      if (!avatar.mimetype || !avatar.mimetype.startsWith('image/')) {
        throw new BadRequestException('Avatar must be an image file');
      }
      if (!avatar.buffer || avatar.buffer.length === 0) {
        throw new BadRequestException('Avatar file is empty');
      }
      const MAX_AVATAR_SIZE = 15 * 1024 * 1024;
      if (avatar.size > MAX_AVATAR_SIZE) {
        throw new BadRequestException('Avatar size must not exceed 15 MB');
      }
      try {
        const { filePath } = await this.fileStorageService.uploadFile(
          avatar,
          user.userId,
          'avatars'
        );
        avatarUrl = filePath;
        const updatedUser = await this.authService.updateProfile(
          user.userId,
          { nickname: user.nickname },
          avatarUrl
        );
        user.avatarUrl = updatedUser.avatarUrl;
      } catch (error) {
        this.logger.error(
          `Failed to upload avatar: ${error instanceof Error ? error.message : String(error)}`
        );
        throw new BadRequestException('Failed to upload avatar file');
      }
    }
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      user.userId,
      user.email
    );
    this.setCookies(res, accessToken, refreshToken);
    return res.json({
      userId: user.userId,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    });
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const user = await this.authService.login(loginDto);
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      user.userId,
      user.email
    );
    this.setCookies(res, accessToken, refreshToken);
    return res.json({ userId: user.userId, email: user.email });
  }
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access token' })
  @ApiResponse({
    status: 200,
    description: 'Token успешно обновлен',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Неверный refresh token' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Refresh token not found' });
    }
    try {
      const { accessToken } = await this.authService.refreshAccessToken(refreshToken);
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
      if (isProduction) {
        const domain = new URL(frontendUrl).hostname;
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 15 * 60 * 1000,
          domain,
          path: '/',
        });
      } else {
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000,
          path: '/',
        });
      }
      return res.json({ success: true });
    } catch (_error) {
      this.clearCookies(res);
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
    }
  }
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы' })
  @ApiCookieAuth('accessToken')
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Успешный выход',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const accessToken = req.cookies?.accessToken;
      const refreshToken = req.cookies?.refreshToken;
      if (accessToken) {
        try {
          const payload = await this.tokenService.decryptToken(accessToken);
          if (payload.sessionId) {
            await this.authService.revokeSession(payload.sessionId);
          }
        } catch (error) {
          this.logger.warn('Failed to revoke session from access token:', error);
        }
      } else if (refreshToken) {
        try {
          const payload = await this.tokenService.decryptToken(refreshToken);
          if (payload.sessionId) {
            await this.authService.revokeSession(payload.sessionId);
          }
        } catch (error) {
          this.logger.warn('Failed to revoke session from refresh token:', error);
        }
      }
    } catch (error) {
      this.logger.warn('Error during logout:', error);
    }
    this.clearCookies(res);
    return res.json({ success: true });
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить информацию о текущем пользователе' })
  @ApiCookieAuth('accessToken')
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Информация о пользователе',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        nickname: { type: 'string', example: 'username123' },
        avatarUrl: { type: 'string', example: 'http://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async me(@CurrentUser() user: RequestUser) {
    const fullUser = await this.authService.validateUser(user.userId);
    return {
      userId: fullUser.id,
      email: fullUser.email,
      nickname: fullUser.nickname,
      avatarUrl: fullUser.avatarUrl,
    };
  }
  @Get('check-nickname')
  @ApiOperation({ summary: 'Проверить доступность никнейма' })
  @ApiQuery({ name: 'nickname', type: String, required: true })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  async checkNickname(@Query('nickname') nickname: string, @CurrentUser() user?: RequestUser) {
    if (!nickname || nickname.length < 3 || nickname.length > 30) {
      throw new BadRequestException('Nickname must be between 3 and 30 characters');
    }
    const excludeUserId = user?.userId;
    const available = await this.authService.checkNicknameAvailability(nickname, excludeUserId);
    return { available };
  }
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить профиль пользователя' })
  @ApiConsumes('multipart/form-data')
  @ApiCookieAuth('accessToken')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    })
  )
  @ApiResponse({
    status: 200,
    description: 'Профиль успешно обновлен',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'user@example.com' },
        nickname: { type: 'string', example: 'username123' },
        avatarUrl: { type: 'string', example: 'http://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Неверные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 409, description: 'Никнейм уже занят' })
  async updateProfile(
    @Req() req: Request,
    @UploadedFile() avatar: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser
  ) {
    const nickname = req.body.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('Nickname is required');
    }
    if (nickname.length < 3 || nickname.length > 30 || !/^[a-zA-Z0-9_]+$/.test(nickname)) {
      throw new BadRequestException(
        'Nickname must be 3-30 characters and contain only letters, numbers, and underscores'
      );
    }
    const updateProfileDto: UpdateProfileDto = {
      nickname,
    };
    let avatarUrl: string | undefined;
    if (avatar) {
      if (!avatar.mimetype.startsWith('image/')) {
        throw new BadRequestException('Avatar must be an image file');
      }
      const MAX_AVATAR_SIZE = 15 * 1024 * 1024;
      if (avatar.size > MAX_AVATAR_SIZE) {
        throw new BadRequestException('Avatar size must not exceed 15 MB');
      }
      const fullUser = await this.authService.validateUser(user.userId);
      if (fullUser.avatarUrl) {
        try {
          await this.fileStorageService.deleteFile(fullUser.avatarUrl);
        } catch (error) {
          this.logger.warn('Failed to delete old avatar:', error);
        }
      }
      const { filePath } = await this.fileStorageService.uploadFile(avatar, user.userId, 'avatars');
      avatarUrl = filePath;
    }
    const updatedUser = await this.authService.updateProfile(
      user.userId,
      updateProfileDto,
      avatarUrl
    );
    return updatedUser;
  }
}
