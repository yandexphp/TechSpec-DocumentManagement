import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class LogCleanupService implements OnModuleInit {
  protected readonly logger = new Logger(LogCleanupService.name);
  private readonly logsDir = path.join(process.cwd(), 'logs');

  onModuleInit(): void {
    this.logger.log('Log cleanup service initialized. Running initial cleanup...');
    this.deleteOldLogs();
  }

  private parseDateFromFolder(folderName: string): Date | null {
    const match = folderName.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) {
      return null;
    }
    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10) - 1;
    const year = Number.parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  @Cron('0 0 0 * * *', {
    timeZone: 'Asia/Almaty',
  })
  handleLogCleanup(): void {
    this.logger.log('Starting log cleanup task');
    this.deleteOldLogs();
  }

  deleteOldLogs(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return;
      }

      const folders = fs.readdirSync(this.logsDir, { withFileTypes: true });
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      let deletedCount = 0;

      for (const folder of folders) {
        if (!folder.isDirectory()) {
          continue;
        }

        const folderDate = this.parseDateFromFolder(folder.name);
        if (!folderDate) {
          continue;
        }

        if (folderDate < oneMonthAgo) {
          const folderPath = path.join(this.logsDir, folder.name);
          fs.rmSync(folderPath, { recursive: true, force: true });
          deletedCount++;
          this.logger.log(`Deleted old log folder: ${folder.name}`);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Log cleanup completed. Deleted ${deletedCount} old log folder(s)`);
      } else {
        this.logger.log('Log cleanup completed. No old logs to delete');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete old logs: ${errorMessage}`);
    }
  }
}
