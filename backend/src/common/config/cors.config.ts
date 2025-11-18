import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function createCorsOptions(configService: ConfigService): CorsOptions {
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:5173');
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const allowedOrigins: string[] = [frontendUrl];
  allowedOrigins.push(
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  );
  if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:*');
  }
  const corsOrigins = configService.get('CORS_ORIGINS');
  if (corsOrigins) {
    const additionalOrigins = corsOrigins.split(',').map((origin: string) => origin.trim());
    allowedOrigins.push(...additionalOrigins);
  }
  const uniqueOrigins = Array.from(new Set(allowedOrigins));
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (uniqueOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (nodeEnv === 'development') {
        const wildcardOrigins = uniqueOrigins.filter((o) => o.includes('*'));
        const originMatches = wildcardOrigins.some((pattern) => {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        });
        if (originMatches) {
          callback(null, true);
          return;
        }
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Content-Type', 'Content-Disposition', 'Cache-Control'],
  };
}