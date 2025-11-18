import * as path from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { createCorsOptions } from './common/config/cors.config';
import { createSwaggerConfig } from './common/config/swagger.config';
import { LOGS_DIR } from './common/logger/constants/log.constants';
import { createWinstonLogger } from './common/logger/factories/winston-logger.factory';

async function bootstrap() {
  const logsDir = path.join(process.cwd(), LOGS_DIR);
  const logger = createWinstonLogger(logsDir);
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
    logger,
  });

  const configService = app.get(ConfigService);
  const bootstrapLogger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.use('/api/documents', (req, res, next) => {
    req.setTimeout(0);
    res.setTimeout(0);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  const corsOptions = createCorsOptions(configService);

  app.enableCors(corsOptions);

  const swaggerConfig = createSwaggerConfig();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs/swagger', app, document, {
    customSiteTitle: 'Document Management API',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = configService.get('PORT', 3000);

  await app.listen(port);

  bootstrapLogger.log(`Application is running on: http://localhost:${port}`);
  bootstrapLogger.log(`Swagger documentation: http://localhost:${port}/api`);
  bootstrapLogger.log(`API endpoints available at: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
