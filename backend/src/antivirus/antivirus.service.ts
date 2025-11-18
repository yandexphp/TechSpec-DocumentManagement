import { Readable } from 'node:stream';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { TNullable } from '../common/types/nullable';

type ClamavScanner = {
  scan: (
    stream: Readable,
    callback: (error: Error | null, object: string | null, malicious: boolean) => void
  ) => void;
};

@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly port: number;
  private scanner: TNullable<ClamavScanner> = null;
  private clamavModule: TNullable<typeof import('clamav.js')> = null;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.enabled = this.configService.get('ANTIVIRUS_ENABLED', 'true') === 'true';
    this.host = this.configService.get('CLAMAV_HOST', 'localhost');
    this.port = Number.parseInt(this.configService.get('CLAMAV_PORT', '3310'), 10);

    if (this.enabled) {
      import('clamav.js')
        .then((clamavModule) => {
          const clamav = 'default' in clamavModule ? clamavModule.default : clamavModule;
          this.clamavModule = clamav as typeof clamavModule;

          if (typeof clamav.createScanner === 'function') {
            this.scanner = clamav.createScanner(this.port, this.host) as ClamavScanner;
            this.logger.log('ClamAV scanner initialized successfully');
          } else {
            throw new Error(
              'clamav.createScanner is not a function. Check clamav.js version and API.'
            );
          }
        })
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to load clamav.js: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined
          );
          this.logger.warn(
            'Antivirus scanning will not be available. Make sure clamav.js is installed and ClamAV service is running.'
          );
        });
    }
  }

  async scanFile(fileBuffer: Buffer, fileName: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Antivirus scanning is disabled');
      return;
    }

    if (!this.scanner) {
      throw new BadRequestException('Antivirus scanner is not initialized');
    }

    try {
      this.logger.log(`Scanning file: ${fileName}`);

      const fileStream = Readable.from(fileBuffer);

      if (!this.scanner) {
        throw new BadRequestException('Antivirus scanner is not initialized');
      }

      const scanner = this.scanner;
      return new Promise<void>((resolve, reject) => {
        scanner.scan(fileStream, (error, object, malicious) => {
          if (error) {
            this.logger.error(`Error scanning file ${fileName}:`, error);

            const failOnError =
              this.configService.get('ANTIVIRUS_FAIL_ON_ERROR', 'true') === 'true';

            if (failOnError) {
              reject(
                new BadRequestException(
                  'Antivirus service is unavailable. File upload is blocked for security reasons.'
                )
              );
            } else {
              this.logger.warn(`ClamAV unavailable, allowing file upload (failOnError=false)`);
              resolve();
            }
            return;
          }

          if (malicious) {
            this.logger.warn(`Virus detected in file ${fileName}: ${object}`);
            reject(new BadRequestException(`File ${fileName} is infected with virus: ${object}`));
            return;
          }

          this.logger.log(`File ${fileName} is clean`);
          resolve();
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Unexpected error scanning file ${fileName}:`, error);
      throw new BadRequestException('Error scanning file for viruses');
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      if (!this.scanner || !this.clamavModule) {
        resolve(false);
        return;
      }

      this.clamavModule.ping(this.port, this.host, (error: Error | null) => {
        if (error) {
          this.logger.warn('ClamAV ping failed:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}
