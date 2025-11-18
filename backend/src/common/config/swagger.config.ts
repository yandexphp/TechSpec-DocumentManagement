import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Document Management System API')
    .setDescription('API для управления документами с аутентификацией и файловым хранилищем')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addCookieAuth('accessToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'accessToken',
      description: 'Access token в cookie (HTTP-only)',
    })
    .addTag('auth', 'Аутентификация и авторизация')
    .addTag('documents', 'Управление документами')
    .build();
}

