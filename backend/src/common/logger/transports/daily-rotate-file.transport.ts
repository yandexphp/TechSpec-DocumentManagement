import * as path from 'node:path';
import * as winston from 'winston';
import Transport from 'winston-transport';

import { getDateFolder, getLogFilePath } from '../utils/log-path.util';

export class DailyRotateFileTransport extends Transport {
  private currentDate: string;
  private readonly baseFilename: string;
  private fileTransport: winston.transports.FileTransportInstance;
  private readonly transportOptions: winston.transports.FileTransportOptions;
  private readonly logsDir: string;

  constructor(options: winston.transports.FileTransportOptions, logsDir: string) {
    super();
    this.logsDir = logsDir;
    this.baseFilename = path.basename(options.filename || 'server.log');
    this.currentDate = getDateFolder();
    this.transportOptions = options;
    this.fileTransport = this.createFileTransport();
  }

  private createFileTransport(): winston.transports.FileTransportInstance {
    const filePath = getLogFilePath(this.baseFilename, this.logsDir);
    return new winston.transports.File({
      ...this.transportOptions,
      filename: filePath,
    });
  }

  private ensureCurrentFile(): void {
    const newDate = getDateFolder();
    if (newDate !== this.currentDate) {
      this.currentDate = newDate;
      if ('close' in this.fileTransport && typeof this.fileTransport.close === 'function') {
        this.fileTransport.close();
      }
      this.fileTransport = this.createFileTransport();
    }
  }

  log(info: winston.LogEntry, callback: () => void): void {
    this.ensureCurrentFile();
    if ('log' in this.fileTransport && typeof this.fileTransport.log === 'function') {
      this.fileTransport.log(info, callback);
    } else {
      callback();
    }
  }

  close(): void {
    if ('close' in this.fileTransport && typeof this.fileTransport.close === 'function') {
      this.fileTransport.close();
    }
  }
}
