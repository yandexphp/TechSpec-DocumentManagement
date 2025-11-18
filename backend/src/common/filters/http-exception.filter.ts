import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import type { ErrorResponse } from '../interfaces/error-response.interface';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const logMessage = `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`;
    this.logger.error(logMessage, exception instanceof Error ? exception.stack : undefined);

    let errorMessage: string | string[] | Record<string, unknown>;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (typeof message === 'object' && message !== null && 'message' in message) {
      errorMessage = message.message as string | string[];
    } else {
      errorMessage = 'Internal server error';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
    };

    response.status(status).json(errorResponse);
  }
}
