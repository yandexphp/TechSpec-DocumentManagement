import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as Minio from 'minio';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly bucketName: string;

  constructor(
    @Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'documents');
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Bucket ${this.bucketName} created`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to ensure bucket: ${errorMessage}`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    subfolder?: string
  ): Promise<{ filePath: string; fileURL: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = subfolder
      ? `${userId}/${subfolder}/${randomUUID()}${fileExtension}`
      : `${userId}/${randomUUID()}${fileExtension}`;

    await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const fileURL = this.getFileURL(fileName);

    return {
      filePath: fileName,
      fileURL,
    };
  }

  async getFileStream(filePath: string) {
    return await this.minioClient.getObject(this.bucketName, filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, filePath);
  }

  async getFile(filePath: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucketName, filePath);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  getFileURL(filePath: string): string {
    const baseURL = this.configService.get<string>('MINIO_BASE_URL', 'http://localhost:9000');
    return `${baseURL}/${filePath}`;
  }
}
