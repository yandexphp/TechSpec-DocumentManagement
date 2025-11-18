export const TOKEN_SERVICE_TOKEN = Symbol('ITokenService');

export interface ITokenService {
  generateTokens(
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  decryptToken(
    token: string
  ): Promise<{ sub: string; email: string; sessionId: string; iat?: number; exp?: number }>;
}
