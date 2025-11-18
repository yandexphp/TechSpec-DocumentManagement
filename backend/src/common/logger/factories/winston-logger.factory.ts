import * as fs from 'node:fs';
import type { LoggerService } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { MAX_LOG_FILE_SIZE, MAX_LOG_FILES } from '../constants/log.constants';
import { DailyRotateFileTransport } from '../transports/daily-rotate-file.transport';

export function createWinstonLogger(logsDir: string): LoggerService {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const transports: winston.transport[] = [
    new DailyRotateFileTransport(
      {
        filename: 'errors.log',
        level: 'error',
        maxsize: MAX_LOG_FILE_SIZE,
        maxFiles: MAX_LOG_FILES,
      },
      logsDir
    ),
    new DailyRotateFileTransport(
      {
        filename: 'server.log',
        maxsize: MAX_LOG_FILE_SIZE,
        maxFiles: MAX_LOG_FILES,
      },
      logsDir
    ),
  ];

  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const timestampStr = `[${timestamp}]:`;
            const contextStr = context ? `[${context}]` : '';
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestampStr} ${level} ${contextStr} ${message} ${metaStr}`;
          })
        ),
      })
    );
  }

  return WinstonModule.createLogger({
    transports,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
  });
}
